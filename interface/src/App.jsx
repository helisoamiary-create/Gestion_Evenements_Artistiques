import { useEffect, useMemo, useState } from 'react'
import './App.css'
import CompteClient from './CompteClient'

function formaterDate(date) {
  if (!date) return 'Date à préciser'

  return new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formaterHeure(heure) {
  return heure ? heure.slice(0, 5) : ''
}

function choisirStyle(type) {
  const categorie = (type || '').toLowerCase()

  if (categorie.includes('musique') || categorie.includes('concert')) {
    return { couleur: 'visuel-musique', symbole: '♫' }
  }

  if (categorie.includes('danse')) {
    return { couleur: 'visuel-danse', symbole: '✳' }
  }

  if (categorie.includes('théâtre') || categorie.includes('theatre')) {
    return { couleur: 'visuel-theatre', symbole: '🎭' }
  }

  return { couleur: 'visuel-culture', symbole: '✦' }
}

function evenementEstAVenir(evenement) {
  if (!evenement?.date) return false

  const maintenant = new Date()
  const dateEvenement = new Date(
    `${evenement.date}T${evenement.heure || '23:59:59'}`
  )

  return dateEvenement > maintenant
}

function prixEnAriary(prix) {
  if (prix === null || prix === undefined || prix === '') {
    return 'Prix à préciser'
  }

  return `${Number(prix).toLocaleString('fr-FR')} Ar`
}

const boutonStyle = {
  border: 'none',
  borderRadius: '10px',
  padding: '12px 18px',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '14px',
}

const champStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  border: '1px solid #d8dce5',
  borderRadius: '8px',
  fontSize: '15px',
  background: '#fff',
  color: '#202536',
}

function App() {
  const [evenements, setEvenements] = useState([])
  const [chargementEvenements, setChargementEvenements] = useState(true)
  const [erreurEvenements, setErreurEvenements] = useState('')
  const [evenementOuvert, setEvenementOuvert] = useState(null)

  const [etatApi, setEtatApi] = useState(null)
  const [erreurApi, setErreurApi] = useState('')

  const [recherche, setRecherche] = useState('')
  const [typeChoisi, setTypeChoisi] = useState('')
  const [lieuChoisi, setLieuChoisi] = useState('')
  const [dateMin, setDateMin] = useState('')
  const [ordreTri, setOrdreTri] = useState('date-asc')

  // États du formulaire de réservation.
  const [evenementReservation, setEvenementReservation] = useState(null)
  const [categorieChoisie, setCategorieChoisie] = useState('')
  const [quantite, setQuantite] = useState('1')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [envoiReservation, setEnvoiReservation] = useState(false)
  const [erreurReservation, setErreurReservation] = useState('')
  const [confirmationReservation, setConfirmationReservation] = useState(null)

  useEffect(() => {
    fetch('/api/etat/')
      .then((reponse) => {
        if (!reponse.ok) {
          throw new Error('Le serveur a renvoyé une erreur.')
        }
        return reponse.json()
      })
      .then((donnees) => {
        setEtatApi(donnees)
        setErreurApi('')
      })
      .catch(() => {
        setErreurApi('Le serveur Django est momentanément inaccessible.')
      })
  }, [])

  async function chargerEvenements() {
    const reponse = await fetch('/api/evenements/')
    if (!reponse.ok) {
      throw new Error('Impossible de récupérer les événements.')
    }

    const donnees = await reponse.json()

    if (!Array.isArray(donnees)) {
      throw new Error('Le format des événements est incorrect.')
    }

    setEvenements(donnees)
    setErreurEvenements('')
  }

  useEffect(() => {
    chargerEvenements()
      .catch(() => {
        setErreurEvenements(
          'Les événements ne peuvent pas être chargés pour le moment.'
        )
      })
      .finally(() => {
        setChargementEvenements(false)
      })
  }, [])

  const typesDisponibles = useMemo(
    () =>
      [
        ...new Set(
          evenements.map((evenement) => evenement.type).filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr')),
    [evenements]
  )

  const lieuxDisponibles = useMemo(
    () =>
      [
        ...new Set(
          evenements.map((evenement) => evenement.lieu).filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr')),
    [evenements]
  )

  const evenementsFiltres = useMemo(() => {
    const motRecherche = recherche.trim().toLocaleLowerCase('fr')

    const resultat = evenements.filter((evenement) => {
      const artistes = Array.isArray(evenement.artistes)
        ? evenement.artistes.join(' ')
        : ''

      const texteEvenement = [
        evenement.titre,
        evenement.type,
        evenement.lieu,
        evenement.adresse,
        evenement.organisateur,
        evenement.description,
        artistes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fr')

      const correspondRecherche =
        !motRecherche || texteEvenement.includes(motRecherche)

      const correspondType = !typeChoisi || evenement.type === typeChoisi
      const correspondLieu = !lieuChoisi || evenement.lieu === lieuChoisi
      const correspondDate =
        !dateMin || (evenement.date && evenement.date >= dateMin)

      return (
        correspondRecherche &&
        correspondType &&
        correspondLieu &&
        correspondDate
      )
    })

    return resultat.sort((a, b) => {
      const dateA = a.date || '9999-12-31'
      const dateB = b.date || '9999-12-31'
      const heureA = a.heure || '00:00:00'
      const heureB = b.heure || '00:00:00'

      const comparaison = `${dateA}T${heureA}`.localeCompare(
        `${dateB}T${heureB}`
      )

      return ordreTri === 'date-desc' ? -comparaison : comparaison
    })
  }, [evenements, recherche, typeChoisi, lieuChoisi, dateMin, ordreTri])

  const filtresActifs = Boolean(
    recherche.trim() || typeChoisi || lieuChoisi || dateMin
  )

  const categoriesReservables = useMemo(() => {
    if (!evenementReservation?.categories) return []

    return evenementReservation.categories.filter((categorie) => {
      const prixValide =
        categorie.prix !== null &&
        categorie.prix !== undefined &&
        Number(categorie.prix) > 0

      const placesValides =
        categorie.places_disponibles !== null &&
        categorie.places_disponibles !== undefined &&
        Number(categorie.places_disponibles) > 0

      return prixValide && placesValides
    })
  }, [evenementReservation])

  const categorieActive = categoriesReservables.find(
    (categorie) => String(categorie.id) === String(categorieChoisie)
  )

  const montantTotal =
    categorieActive && Number(quantite) > 0
      ? Number(categorieActive.prix) * Number(quantite)
      : 0

  function reinitialiserFiltres() {
    setRecherche('')
    setTypeChoisi('')
    setLieuChoisi('')
    setDateMin('')
    setOrdreTri('date-asc')
    setEvenementOuvert(null)
  }

  function ouvrirReservation(evenement) {
    setEvenementReservation(evenement)
    setCategorieChoisie('')
    setQuantite('1')
    setErreurReservation('')
    setConfirmationReservation(null)
  }

  function fermerReservation() {
    if (envoiReservation) return

    setEvenementReservation(null)
    setErreurReservation('')
    setConfirmationReservation(null)
  }

  async function envoyerReservation(e) {
    e.preventDefault()
    setErreurReservation('')
    setConfirmationReservation(null)

    if (!evenementReservation) {
      setErreurReservation('Aucun événement n’a été sélectionné.')
      return
    }

    if (!categorieActive) {
      setErreurReservation('Choisis une catégorie de tickets disponible.')
      return
    }

    const quantiteDemandee = Number(quantite)

    if (
      !Number.isInteger(quantiteDemandee) ||
      quantiteDemandee < 1
    ) {
      setErreurReservation('La quantité doit être un nombre entier positif.')
      return
    }

    if (quantiteDemandee > Number(categorieActive.places_disponibles)) {
      setErreurReservation(
        'La quantité demandée dépasse le nombre de places affiché.'
      )
      return
    }

    setEnvoiReservation(true)

    try {
      // Django fournit le jeton CSRF requis pour le formulaire.
      const reponseCsrf = await fetch('/api/csrf/', {
        method: 'GET',
        credentials: 'same-origin',
      })

      if (!reponseCsrf.ok) {
        throw new Error(
          'Impossible de préparer la sécurité du formulaire. Réessaie.'
        )
      }

      const donneesCsrf = await reponseCsrf.json()

      if (!donneesCsrf.csrfToken) {
        throw new Error('Le jeton de sécurité est indisponible.')
      }

      const reponse = await fetch('/api/reservations/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': donneesCsrf.csrfToken,
        },
        body: JSON.stringify({
          id_evenement: evenementReservation.id,
          id_categorie: Number(categorieChoisie),
          quantite: quantiteDemandee,
          nom: nom.trim(),
          prenom: prenom.trim(),
          email: email.trim(),
          telephone: telephone.trim(),
        }),
      })

      const resultat = await reponse.json()

      if (!reponse.ok) {
        throw new Error(
          resultat.erreur || 'La réservation n’a pas pu être enregistrée.'
        )
      }

      setConfirmationReservation(resultat)

      // Actualise le nombre de places après l'enregistrement.
      await chargerEvenements()

      // Met à jour également les catégories de la fenêtre de réservation.
      setEvenementReservation((ancien) => {
        if (!ancien) return ancien

        return (
          evenements.find((item) => item.id === ancien.id) || ancien
        )
      })
    } catch (erreur) {
      setErreurReservation(
        erreur.message ||
          'Une erreur est survenue pendant la réservation.'
      )
    } finally {
      setEnvoiReservation(false)
    }
  }

  return (
    <div className="application">
      <header className="entete">
        <a className="logo" href="#accueil" aria-label="ArtEvent, accueil">
          <span className="logo-symbole">✳</span>
          <span>
            Art<span className="logo-accent">Event</span>
          </span>
        </a>

        <nav className="navigation" aria-label="Navigation principale">
          <a className="lien-actif" href="#accueil">Accueil</a>
          <a href="#evenements">Événements</a>
          <a href="#apropos">À propos</a>
          <a href="#explication">Le projet</a>
        </nav>

        <CompteClient />
      </header>

      <main>
        <section className="hero" id="accueil">
          <div className="hero-contenu">
            <span className="surtitre">
              <span className="petit-signe">✦</span>
              LA CULTURE PREND VIE À TANANARIVE
            </span>

            <h1>
              De beaux moments,
              <span> à vivre ensemble.</span>
            </h1>

            <p className="hero-description">
              Un concert, un spectacle de danse ou une découverte artistique :
              trouvez une occasion de sortir, de partager et de profiter de la
              richesse culturelle de Madagascar.
            </p>

            <a className="bouton-principal" href="#evenements">
              Découvrir les événements <span>→</span>
            </a>            
          </div>

          <div className="hero-visuel">
            <div className="illustration">
              <span className="illustration-petit-texte">
                ART · MUSIQUE · RENCONTRES
              </span>

              <div className="illustration-disque">
                <span>♫</span>
              </div>

              <div className="illustration-texte">
                <span>La culture nous rassemble</span>
                <strong>
                  Vivez
                  <br />
                  l'instant.
                </strong>
              </div>

              <span className="illustration-etoile etoile-une">✦</span>
              <span className="illustration-etoile etoile-deux">✳</span>
            </div>


          </div>
        </section>

        <section className="evenements-section" id="evenements">
          <div className="section-entete">
            <div>
              <span className="surtitre">PRENEZ LE TEMPS DE DÉCOUVRIR</span>
              <h2>Les événements à découvrir</h2>
              <p>
                Des rendez-vous artistiques pour se retrouver et partager
                de bons moments.
              </p>
            </div>

            <span className="compteur-evenements">
              {chargementEvenements
                ? 'Chargement...'
                : `${evenementsFiltres.length} résultat${
                    evenementsFiltres.length > 1 ? 's' : ''
                  }`}
            </span>
          </div>

          {!chargementEvenements && !erreurEvenements && (
            <div className="filtres-evenements">
              <div className="champ-recherche">
                <label htmlFor="recherche-evenement">
                  Rechercher un événement
                </label>
                <input
                  id="recherche-evenement"
                  type="search"
                  placeholder="Titre, artiste, lieu, organisateur..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
              </div>

              <div className="filtres-ligne">
                <div className="champ-filtre">
                  <label htmlFor="filtre-type">Type d'événement</label>
                  <select
                    id="filtre-type"
                    value={typeChoisi}
                    onChange={(e) => setTypeChoisi(e.target.value)}
                  >
                    <option value="">Tous les types</option>
                    {typesDisponibles.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="champ-filtre">
                  <label htmlFor="filtre-lieu">Lieu</label>
                  <select
                    id="filtre-lieu"
                    value={lieuChoisi}
                    onChange={(e) => setLieuChoisi(e.target.value)}
                  >
                    <option value="">Tous les lieux</option>
                    {lieuxDisponibles.map((lieu) => (
                      <option key={lieu} value={lieu}>{lieu}</option>
                    ))}
                  </select>
                </div>

                <div className="champ-filtre">
                  <label htmlFor="filtre-date">À partir du</label>
                  <input
                    id="filtre-date"
                    type="date"
                    value={dateMin}
                    onChange={(e) => setDateMin(e.target.value)}
                  />
                </div>

                <div className="champ-filtre">
                  <label htmlFor="tri-evenements">Trier par date</label>
                  <select
                    id="tri-evenements"
                    value={ordreTri}
                    onChange={(e) => setOrdreTri(e.target.value)}
                  >
                    <option value="date-asc">Plus proches d'abord</option>
                    <option value="date-desc">Plus éloignés d'abord</option>
                  </select>
                </div>
              </div>

              <div className="filtres-actions">
                <span>
                  {filtresActifs
                    ? `${evenementsFiltres.length} événement(s) correspondent à ta recherche.`
                    : 'Explore tous les événements disponibles.'}
                </span>

                {filtresActifs && (
                  <button
                    className="bouton-reinitialiser"
                    type="button"
                    onClick={reinitialiserFiltres}
                  >
                    Effacer les filtres ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {chargementEvenements && (
            <div className="message-etat">
              Nous préparons la liste des événements...
            </div>
          )}

          {!chargementEvenements && erreurEvenements && (
            <div className="message-etat message-erreur">
              {erreurEvenements}
              <p>
                Vérifie que le serveur Django est bien démarré,
                puis actualise la page.
              </p>
            </div>
          )}

          {!chargementEvenements &&
            !erreurEvenements &&
            evenements.length === 0 && (
              <div className="message-vide">
                <span className="vide-symbole">♫</span>
                <h3>La scène attend ses prochains rendez-vous.</h3>
                <p>
                  Aucun événement n'est disponible pour le moment.
                  Ajoute un événement depuis l'administration Django pour
                  le faire apparaître ici.
                </p>
              </div>
            )}

          {!chargementEvenements &&
            !erreurEvenements &&
            evenements.length > 0 &&
            evenementsFiltres.length === 0 && (
              <div className="message-vide">
                <span className="vide-symbole">⌕</span>
                <h3>Aucun événement ne correspond à ces critères.</h3>
                <p>
                  Essaie un autre mot-clé ou modifie les filtres pour
                  découvrir d'autres rendez-vous.
                </p>
                <button
                  className="bouton-principal bouton-vide"
                  type="button"
                  onClick={reinitialiserFiltres}
                >
                  Afficher tous les événements
                </button>
              </div>
            )}

          {!chargementEvenements &&
            !erreurEvenements &&
            evenementsFiltres.length > 0 && (
              <div className="cartes-evenements">
                {evenementsFiltres.map((evenement) => {
                  const style = choisirStyle(evenement.type)
                  const detailsOuverts = evenementOuvert === evenement.id
                  const aVenir = evenementEstAVenir(evenement)
                  const placesDisponibles = (evenement.categories || []).some(
                    (categorie) =>
                      Number(categorie.places_disponibles) > 0 &&
                      Number(categorie.prix) > 0
                  )

                  return (
                    <article className="carte-evenement" key={evenement.id}>
                      <div className={`carte-visuel ${style.couleur}`}>
                        <span className="carte-categorie">
                          {evenement.type || 'Culture'}
                        </span>
                        <span className="carte-symbole">{style.symbole}</span>
                        <span className="carte-decoration">✦</span>
                      </div>

                      <div className="carte-contenu">
                        <p className="carte-date">
                          {formaterDate(evenement.date)}
                          {evenement.heure &&
                            ` · ${formaterHeure(evenement.heure)}`}
                        </p>

                        <h3>{evenement.titre}</h3>

                        <p className="carte-lieu">
                          <span aria-hidden="true">⌖</span>
                          {evenement.lieu || 'Lieu à préciser'}
                        </p>

                        {evenement.adresse && (
                          <p className="carte-adresse">{evenement.adresse}</p>
                        )}

                        <button
                          className="bouton-details"
                          type="button"
                          aria-expanded={detailsOuverts}
                          onClick={() =>
                            setEvenementOuvert(
                              detailsOuverts ? null : evenement.id
                            )
                          }
                        >
                          {detailsOuverts ? 'Masquer les détails' : 'En savoir plus'}
                          <span>{detailsOuverts ? '↑' : '→'}</span>
                        </button>

                        {detailsOuverts && (
                          <div className="details-evenement">
                            <p>
                              {evenement.description ||
                                'La description de cet événement sera communiquée prochainement.'}
                            </p>

                            {evenement.organisateur && (
                              <p>
                                <strong>Organisé par :</strong>{' '}
                                {evenement.organisateur}
                              </p>
                            )}

                            {evenement.artistes?.length > 0 && (
                              <p>
                                <strong>Artistes :</strong>{' '}
                                {evenement.artistes.join(', ')}
                              </p>
                            )}

                            {evenement.categories?.length > 0 && (
                              <div className="details-categories">
                                <strong>Catégories de tickets</strong>
                                {evenement.categories.map((categorie) => (
                                  <div
                                    className="ligne-categorie"
                                    key={categorie.id}
                                  >
                                    <span>
                                      {categorie.nom}
                                      {categorie.places_disponibles !== null &&
                                        categorie.places_disponibles !== undefined &&
                                        ` · ${categorie.places_disponibles} place(s)`}
                                    </span>
                                    <span>{prixEnAriary(categorie.prix)}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {aVenir && placesDisponibles ? (
                              <button
                                type="button"
                                style={{
                                  ...boutonStyle,
                                  background: '#6c4be8',
                                  color: '#fff',
                                  marginTop: '16px',
                                  width: '100%',
                                }}
                                onClick={() => ouvrirReservation(evenement)}
                              >
                                Réserver mes tickets →
                              </button>
                            ) : (
                              <p style={{ marginTop: '14px', color: '#8a5060' }}>
                                {aVenir
                                  ? 'Aucune place disponible pour le moment.'
                                  : 'Les réservations sont fermées pour cet événement.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

          <p className="note-evenements">
            Les informations affichées proviennent de la base de données
            de l'application.
          </p>
        </section>

        <section className="apropos-section" id="apropos">
          <div className="apropos-titre">
            <span className="surtitre">À PROPOS D'ARTEVENT</span>
            <h2>Les plus beaux souvenirs commencent parfois par une sortie.</h2>
          </div>

          <div className="apropos-description">
            <p>
              ArtEvent est un projet académique consacré à la gestion des
              événements artistiques. Son objectif est de faciliter la
              découverte des activités culturelles et de mieux organiser
              les informations qui leur sont associées.
            </p>
            <p>
              Django traite les données et expose les informations via une API.
              React construit l'interface utilisée par le public, tandis que
              la base relationnelle organise les événements, les lieux, les
              organisateurs, les artistes, les réservations et les paiements.
            </p>
            <a className="lien-principal" href="#explication">
              Comprendre le fonctionnement du projet →
            </a>
          </div>
        </section>

        <section className="explication-section" id="explication">
          <div className="explication-entete">
            <span className="surtitre">COMPRENDRE ARTEVENT</span>
            <h2>Comment fonctionne le projet ?</h2>
            <p>
              ArtEvent est un projet académique de gestion des événements artistiques.
              Il associe une base de données relationnelle, une application serveur
              et une interface web pour présenter les événements et enregistrer
              les demandes de réservation.
            </p>
          </div>

          <div className="architecture-projet" aria-label="Architecture du projet">
            <article className="architecture-carte">
              <span className="architecture-numero">01</span>
              <h3>Base de données relationnelle</h3>
              <p>
                Elle conserve les informations structurées et les liens entre
                événements, lieux, artistes, organisateurs, tickets, clients,
                réservations et paiements.
              </p>
            </article>
            <article className="architecture-carte">
              <span className="architecture-numero">02</span>
              <h3>Django — serveur et API</h3>
              <p>
                Django reçoit les requêtes de l'interface, vérifie les données,
                applique les règles de réservation et renvoie des réponses au format JSON.
              </p>
            </article>
            <article className="architecture-carte">
              <span className="architecture-numero">03</span>
              <h3>React — interface web</h3>
              <p>
                React affiche les événements, permet la recherche et les filtres,
                présente les détails et transmet les demandes de réservation au serveur.
              </p>
            </article>
          </div>

          <div className="explication-bloc">
            <span className="surtitre">01 · LE SGBDR</span>
            <h3>Les neuf tables de la base de données</h3>
            <p>
              Un SGBDR (système de gestion de base de données relationnelle) permet
              d'organiser les informations dans des tables reliées entre elles.
              Chaque table possède un rôle précis.
            </p>
            <div className="tables-explication">
              <article><h4>Organisateur</h4><p>Identifie les personnes ou structures qui organisent les événements, avec leurs coordonnées.</p></article>
              <article><h4>Artiste</h4><p>Conserve le nom, le genre artistique et les coordonnées des artistes.</p></article>
              <article><h4>Lieu</h4><p>Décrit l'endroit où se déroule un événement, son adresse et éventuellement sa capacité maximale.</p></article>
              <article><h4>Événement</h4><p>Enregistre le titre, la date, l'heure, la description et le type, avec des liens vers le lieu et l'organisateur.</p></article>
              <article><h4>Catégorie_ticket</h4><p>Définit les catégories de tickets d'un événement, leur prix et le nombre de places disponibles.</p></article>
              <article><h4>Client</h4><p>Conserve les informations des personnes qui effectuent une réservation.</p></article>
              <article><h4>Réservation</h4><p>Enregistre la date, la quantité de tickets, le statut et les liens vers le client et la catégorie choisie.</p></article>
              <article><h4>Paiement</h4><p>Suit le montant, la date éventuelle, le mode et le statut du paiement associé à une réservation.</p></article>
              <article><h4>Participation</h4><p>Relie les artistes aux événements auxquels ils participent. Sa clé primaire est composée des identifiants de l'artiste et de l'événement.</p></article>
            </div>
          </div>

          <div className="explication-deux-colonnes">
            <article className="explication-bloc">
              <span className="surtitre">02 · RELATIONS ET INTÉGRITÉ</span>
              <h3>Comment les tables sont-elles reliées ?</h3>
              <ul>
                <li><strong>Clé primaire (PK) :</strong> identifie de manière unique une ligne d'une table.</li>
                <li><strong>Clé étrangère (FK) :</strong> relie une ligne à une ligne d'une autre table et aide à préserver la cohérence des données.</li>
                <li><strong>Relations un-à-plusieurs :</strong> un lieu ou un organisateur peut être associé à plusieurs événements ; un client peut avoir plusieurs réservations.</li>
                <li><strong>Relation plusieurs-à-plusieurs :</strong> les artistes et les événements sont reliés par la table Participation.</li>
                <li><strong>Contraintes :</strong> NOT NULL impose une valeur, UNIQUE empêche certains doublons et CHECK vérifie des conditions comme un prix ou une capacité positive.</li>
              </ul>
            </article>
            <article className="explication-bloc">
              <span className="surtitre">03 · SQL</span>
              <h3>Les traitements étudiés</h3>
              <ul>
                <li><strong>Requêtes SELECT et jointures :</strong> lire les informations et combiner les données de plusieurs tables.</li>
                <li><strong>Vue <code>vue_evenements_lieux</code> :</strong> présenter ensemble les informations des événements et de leurs lieux.</li>
                <li><strong>Fonction <code>calculMontant(prix, qte)</code> :</strong> calculer un montant à partir d'un prix et d'une quantité.</li>
                <li><strong>Déclencheur (trigger) :</strong> le trigger <code>diminuer_places_apres_reservation</code> met à jour les places de la catégorie après l'insertion d'une réservation.</li>
                <li><strong>Transactions :</strong> regrouper plusieurs opérations afin de préserver la cohérence lors d'un traitement.</li>
              </ul>
              <p className="note-technique">
                Les opérations disponibles dépendent du moteur SQL utilisé. Les exemples
                de fonctions, de vues et de déclencheurs sont présentés dans le cadre
                de l'étude SGBDR du projet.
              </p>
            </article>
          </div>

          <div className="explication-bloc">
            <span className="surtitre">04 · COMMUNICATION ENTRE LES TECHNOLOGIES</span>
            <h3>De l'écran à la base de données</h3>
            <ol className="etapes-techniques">
              <li><strong>L'utilisateur agit dans React.</strong> Il consulte un événement, applique un filtre ou remplit le formulaire de réservation.</li>
              <li><strong>React envoie une requête HTTP à l'API Django.</strong> Les données de réservation sont transmises au format JSON.</li>
              <li><strong>Django vérifie la demande.</strong> Le serveur contrôle l'événement, la catégorie, la quantité, les coordonnées et les places restantes.</li>
              <li><strong>La base de données conserve les données.</strong> Si la demande est valide, les informations de client, de réservation et de paiement associé sont enregistrées et les places sont mises à jour.</li>
              <li><strong>Django renvoie une réponse JSON.</strong> React affiche une confirmation ou un message expliquant pourquoi la demande n'a pas abouti.</li>
            </ol>
            <div className="avertissement-paiement">
              <strong>À propos du paiement :</strong> la réservation actuelle enregistre une demande
              et un statut de paiement « En attente ». Elle ne réalise pas de paiement en ligne
              et ne doit pas être présentée comme une transaction financière réelle.
            </div>
          </div>

          <div className="explication-fin">
            <p>
              Ce projet met ainsi en pratique la conception relationnelle, les contraintes
              d'intégrité, les requêtes SQL, le traitement côté serveur et la création
              d'une interface web interactive.
            </p>
            <a className="lien-principal" href="#accueil">Retour à l'accueil ↑</a>
          </div>
        </section>
      </main>

      <footer className="pied-page">
        <a className="logo" href="#accueil">
          <span className="logo-symbole">✳</span>
          <span>
            Art<span className="logo-accent">Event</span>
          </span>
        </a>
        <p>
          Un projet étudiant autour de la culture et des événements artistiques.
        </p>
        <a className="lien-retour" href="#accueil">Retour en haut ↑</a>
      </footer>

      {/* Fenêtre de réservation */}
      {evenementReservation && (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fermerReservation()
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(20, 22, 40, 0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-reservation"
            style={{
              background: '#fff',
              color: '#202536',
              borderRadius: '16px',
              padding: 'clamp(20px, 4vw, 32px)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,.25)',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '18px',
              }}
            >
              <div>
                <span
                  style={{
                    color: '#6c4be8',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                  }}
                >
                  ARTEVENT · RÉSERVATION
                </span>
                <h2
                  id="titre-reservation"
                  style={{ margin: '8px 0', fontSize: '24px' }}
                >
                  {confirmationReservation
                    ? 'Demande enregistrée !'
                    : 'Réserver des tickets'}
                </h2>
                <p style={{ margin: 0, color: '#626779', lineHeight: 1.5 }}>
                  {evenementReservation.titre}
                </p>
                <p style={{ margin: '6px 0 0', color: '#626779' }}>
                  {formaterDate(evenementReservation.date)}
                  {' · '}
                  {formaterHeure(evenementReservation.heure)}
                </p>
              </div>

              {!envoiReservation && (
                <button
                  type="button"
                  aria-label="Fermer la réservation"
                  onClick={fermerReservation}
                  style={{
                    ...boutonStyle,
                    padding: '6px 11px',
                    background: '#f1eff8',
                    color: '#30234f',
                    fontSize: '20px',
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {confirmationReservation ? (
              <div>
                <div
                  style={{
                    padding: '18px',
                    background: '#eefaf3',
                    border: '1px solid #b9e7c9',
                    borderRadius: '10px',
                    lineHeight: 1.8,
                  }}
                >
                  <p style={{ marginTop: 0, color: '#17683a', fontWeight: 700 }}>
                    {confirmationReservation.message}
                  </p>
                  <p>
                    <strong>Numéro de réservation :</strong>{' '}
                    {confirmationReservation.reservation?.id}
                  </p>
                  <p>
                    <strong>Événement :</strong>{' '}
                    {confirmationReservation.reservation?.evenement}
                  </p>
                  <p>
                    <strong>Catégorie :</strong>{' '}
                    {confirmationReservation.reservation?.categorie}
                  </p>
                  <p>
                    <strong>Quantité :</strong>{' '}
                    {confirmationReservation.reservation?.quantite}
                  </p>
                  <p>
                    <strong>Prix unitaire :</strong>{' '}
                    {prixEnAriary(
                      confirmationReservation.reservation?.prix_unitaire
                    )}
                  </p>
                  <p>
                    <strong>Montant total :</strong>{' '}
                    {prixEnAriary(
                      confirmationReservation.reservation?.montant_total
                    )}
                  </p>
                  <p style={{ marginBottom: 0 }}>
                    <strong>Statut du paiement :</strong> En attente
                  </p>
                </div>

                <p style={{ color: '#626779', lineHeight: 1.6 }}>
                  Aucun paiement n'a été effectué en ligne. Conserve le numéro
                  de réservation pour retrouver cette demande.
                </p>

                <button
                  type="button"
                  style={{
                    ...boutonStyle,
                    width: '100%',
                    background: '#6c4be8',
                    color: '#fff',
                  }}
                  onClick={fermerReservation}
                >
                  Terminer
                </button>
              </div>
            ) : (
              <form onSubmit={envoyerReservation}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                    gap: '14px',
                  }}
                >
                  <div>
                    <label
                      htmlFor="reservation-nom"
                      style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}
                    >
                      Nom *
                    </label>
                    <input
                      id="reservation-nom"
                      autoComplete="family-name"
                      required
                      maxLength={50}
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      style={champStyle}
                      placeholder="Ton nom"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reservation-prenom"
                      style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}
                    >
                      Prénom *
                    </label>
                    <input
                      id="reservation-prenom"
                      autoComplete="given-name"
                      required
                      maxLength={50}
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      style={champStyle}
                      placeholder="Ton prénom"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reservation-email"
                      style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}
                    >
                      Adresse e-mail *
                    </label>
                    <input
                      id="reservation-email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={100}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={champStyle}
                      placeholder="exemple@email.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reservation-telephone"
                      style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}
                    >
                      Téléphone
                    </label>
                    <input
                      id="reservation-telephone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={20}
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      style={champStyle}
                      placeholder="Numéro de téléphone"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reservation-categorie"
                      style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}
                    >
                      Catégorie de ticket *
                    </label>
                    <select
                      id="reservation-categorie"
                      required
                      value={categorieChoisie}
                      onChange={(e) => setCategorieChoisie(e.target.value)}
                      style={champStyle}
                    >
                      <option value="">Choisir une catégorie</option>
                      {categoriesReservables.map((categorie) => (
                        <option key={categorie.id} value={categorie.id}>
                          {categorie.nom} — {prixEnAriary(categorie.prix)}
                          {' · '}
                          {categorie.places_disponibles} place(s)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="reservation-quantite"
                      style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}
                    >
                      Quantité *
                    </label>
                    <input
                      id="reservation-quantite"
                      type="number"
                      required
                      min="1"
                      max={categorieActive?.places_disponibles || 1}
                      step="1"
                      value={quantite}
                      onChange={(e) => setQuantite(e.target.value)}
                      style={champStyle}
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    borderRadius: '10px',
                    background: '#f5f2ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontWeight: 700 }}>Montant total estimé</span>
                  <strong style={{ color: '#6c4be8', fontSize: '20px' }}>
                    {prixEnAriary(montantTotal)}
                  </strong>
                </div>

                <p style={{ fontSize: '13px', color: '#626779', lineHeight: 1.6 }}>
                  Le montant sera enregistré dans la demande. Cette étape
                  ne réalise pas de paiement en ligne.
                </p>

                {categoriesReservables.length === 0 && (
                  <p role="alert" style={{ color: '#b42318' }}>
                    Aucune catégorie avec un prix et des places disponibles
                    n'est actuellement réservable.
                  </p>
                )}

                {erreurReservation && (
                  <p
                    role="alert"
                    style={{
                      color: '#b42318',
                      background: '#fff0ef',
                      borderRadius: '8px',
                      padding: '12px',
                      lineHeight: 1.5,
                    }}
                  >
                    {erreurReservation}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginTop: '18px',
                  }}
                >
                  <button
                    type="submit"
                    disabled={
                      envoiReservation || categoriesReservables.length === 0
                    }
                    style={{
                      ...boutonStyle,
                      flex: '1 1 220px',
                      background:
                        envoiReservation || categoriesReservables.length === 0
                          ? '#b9b2d7'
                          : '#6c4be8',
                      color: '#fff',
                      cursor:
                        envoiReservation || categoriesReservables.length === 0
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {envoiReservation
                      ? 'Enregistrement en cours...'
                      : 'Confirmer la réservation'}
                  </button>

                  <button
                    type="button"
                    disabled={envoiReservation}
                    onClick={fermerReservation}
                    style={{
                      ...boutonStyle,
                      background: '#f1eff8',
                      color: '#30234f',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default App
