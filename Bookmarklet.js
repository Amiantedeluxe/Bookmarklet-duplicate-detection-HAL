(function() {
  // Fonction pour afficher les messages dans une popup
  function showMessage(message) {
    let div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '20px';
    div.style.right = '20px';
    div.style.backgroundColor = 'white';
    div.style.border = '2px solid #444';
    div.style.padding = '10px';
    div.style.zIndex = 9999;
    div.style.maxHeight = '70%';
    div.style.overflowY = 'auto';
    div.style.width = '400px';
    div.innerHTML = message;
    
    let closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fermer';
    closeBtn.onclick = () => div.remove();
    div.appendChild(closeBtn);
    document.body.appendChild(div);
  }

  // Extraction des informations depuis l'URL
  let pathParts = window.location.pathname.split('/');
  let halId, docid, apiUrl;

  // Détection du type d'URL
  if (pathParts.includes('moderate') && pathParts.includes('docid')) {
    // URL de modération : utiliser l'API CRAC
    let idx = pathParts.indexOf('docid');
    if (idx !== -1 && pathParts[idx + 1]) {
      docid = pathParts[idx + 1];
      apiUrl = `https://api.archives-ouvertes.fr/crac/hal/?q=docid:${docid}&fl=halId_s,title_s,doiId_s&wt=json`;
    }
  } else {
    // URL classique : utiliser l'API search standard
    halId = pathParts[pathParts.length - 1];
    if (halId && halId.match(/^hal/)) {
      apiUrl = `https://api.archives-ouvertes.fr/search/?q=halId_s:"${halId}"&fl=halId_s,title_s,doiId_s&wt=json`;
    }
  }

  if (!apiUrl) {
    showMessage("<b>URL non reconnue</b>");
    return;
  }

  let halIdBase = halId ? halId.replace(/v\d+$/, '') : '';

  // Récupération de la notice HAL
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      function processDocument(doc) {
        if (!doc) {
          showMessage("<b>Aucune notice HAL trouvée.</b>");
          return;
        }

        let currentHalId = doc.halId_s || '';
        if (!halIdBase) halIdBase = currentHalId.replace(/v\d+$/, '');

        let title = Array.isArray(doc.title_s) ? doc.title_s[0] : doc.title_s || "";
        let doi = Array.isArray(doc.doiId_s) ? doc.doiId_s[0] : doc.doiId_s || "";
        
        // Extraction des 12 premiers mots du titre pour la recherche
        let titleWords = title.replace(/[()":!?,;'-]/g, "").split(/\s+/).slice(0, 12).join(" ");
        
        // Construction de la requête de recherche de doublons
        let queryParts = [];
        if (doi) queryParts.push(`doiId_s:"${doi}"`);
        if (titleWords) queryParts.push(`title_t:(${titleWords})`);
        let searchQuery = queryParts.join(" OR ");
        
        let searchUrl = `https://api.archives-ouvertes.fr/search/?q=${encodeURIComponent(searchQuery)}&fl=halId_s,title_s,doiId_s&wt=json&rows=50`;

        // Recherche des doublons potentiels
        fetch(searchUrl)
          .then(response => response.json())
          .then(searchResults => {
            if (!searchResults.response || !searchResults.response.docs) {
              showMessage("<b>Erreur lors de la recherche de doublons.</b>");
              return;
            }

            // Filtrage des résultats pour exclure la notice courante
            let duplicates = searchResults.response.docs.filter(x => {
              let xId = (x.halId_s || "").replace(/v\d+$/, '');
              let xDoi = Array.isArray(x.doiId_s) ? x.doiId_s[0] : x.doiId_s || "";
              
              // Exclure la notice elle-même
              if (xId === halIdBase) return false;
              
              // Si les deux ont un DOI, ils doivent matcher
              if (doi && xDoi) return xDoi === doi;
              
              // Sinon accepter (match par titre)
              return true;
            });

            if (duplicates.length === 0) {
              showMessage("<b>Pas de doublon détecté</b>");
              return;
            }

            // Affichage des doublons
            let content = "<b>Doublons potentiels :</b><ul>";
            duplicates.forEach(x => {
              let id = x.halId_s;
              let dupTitle = Array.isArray(x.title_s) ? x.title_s[0] : x.title_s || "";
              let dupDoi = Array.isArray(x.doiId_s) ? x.doiId_s[0] : x.doiId_s || "";
              let url = "https://hal.science/" + id;
              content += `<li><a href="${url}" target="_blank">${id}</a> | ${dupTitle} | ${dupDoi ? 'DOI: ' + dupDoi : ''}</li>`;
            });
            content += "</ul>";
            showMessage(content);
          })
          .catch(error => showMessage("Erreur recherche doublons : " + error));
      }

      // Traitement de la réponse
      if (data && data.response && data.response.docs && data.response.docs.length) {
        processDocument(data.response.docs[0]);
      } else if (halIdBase) {
        // Fallback pour les URLs avec version
        let fallbackUrl = `https://api.archives-ouvertes.fr/search/?q=halId_s:"${halIdBase}"&fl=halId_s,title_s,doiId_s&wt=json`;
        fetch(fallbackUrl)
          .then(response => response.json())
          .then(fallbackData => {
            if (fallbackData && fallbackData.response && fallbackData.response.docs && fallbackData.response.docs.length) {
              processDocument(fallbackData.response.docs[0]);
            } else {
              showMessage("<b>Aucune notice HAL trouvée.</b>");
            }
          })
          .catch(error => showMessage("Erreur notice HAL (fallback) : " + error));
      } else {
        showMessage("<b>Aucune notice HAL trouvée</b>");
      }
    })
    .catch(error => showMessage("Erreur notice HAL : " + error));
})();
