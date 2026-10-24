
import { useEffect, useState } from 'react'
import './CompteClient.css'

async function obtenirCsrf() {
  const reponse = await fetch('/api/csrf/', {
    credentials: 'same-origin',
  })

  if (!reponse.ok) {
    throw new Error('Impossible de préparer la sécurité du formulaire.')
  }

  const donnees = await reponse.json()

  if (!donnees.csrfToken) {
    throw new Error('Le jeton de sécurité est indisponible.')
  }

  return donnees.csrfToken
}

async function envoyerJson(url, donnees, csrf) {
  const reponse = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    },
    body: JSON.stringify(donnees),
  })

  const resultat = await reponse.json()

  if (!reponse.ok) {
    throw new Error(
      resultat.message ||
      resultat.erreur ||
      'Une erreur est survenue. Réessaie.'
    )
  }

  return resultat
}

function afficherDate(date) {
  if (!date) return 'Date non précisée'

  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function prixAriary(montant) {
  if (montant === null || montant === undefined) return '—'
  return `${Number(montant).toLocaleString('fr-FR')} Ar`
}

export default function CompteClient({ onSessionChange }) {
  const [ouvert, setOuvert] = useState(false)
  const [mode, setMode] = useState('connexion')
  const [utilisateur, setUtilisateur] = useState(null)
  const [reservations, setReservations] = useState([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')

  async function verifierSession() {
    try {
      const reponse = await fetch('/api/compte/session/', {
        credentials: 'same-origin',
      })

      if (!reponse.ok) return

      const donnees = await reponse.json()
      setUtilisateur(donnees.connecte ? donnees.utilisateur : null)

      onSessionChange?.(donnees.connecte ? donnees.utilisateur : null)
    } catch {
      // Le site public reste utilisable si la session ne peut pas être vérifiée.
    }
  }

  useEffect(() => {
    verifierSession()
  }, [])

  useEffect(() => {
    if (ouvert) {
      setErreur('')
      setMessage('')
    }
  }, [ouvert])

  async function chargerReservations() {
    setChargement(true)
    setErreur('')

    try {
      const reponse = await fetch('/api/compte/reservations/', {
        credentials: 'same-origin',
      })

      const donnees = await reponse.json()

      if (!reponse.ok) {
        throw new Error(
          donnees.message || 'Impossible de charger les réservations.'
        )
      }

      setReservations(donnees.reservations || [])
    } catch (e) {
      setErreur(e.message || 'Erreur lors du chargement des réservations.')
    } finally {
      setChargement(false)
    }
  }

  async function traiterFormulaire(e) {
    e.preventDefault()
    setErreur('')
    setMessage('')

    if (mode === 'inscription' && motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }

    setEnvoi(true)

    try {
      const csrf = await obtenirCsrf()

      if (mode === 'inscription') {
        await envoyerJson(
          '/api/compte/inscription/',
          {
            nom: nom.trim(),
            prenom: prenom.trim(),
            email: email.trim(),
            mot_de_passe: motDePasse,
            confirmation_mot_de_passe: confirmation,
          },
          csrf
        )

        setMessage('Compte créé avec succès. Tu peux maintenant te connecter.')
        setMode('connexion')
        setMotDePasse('')
        setConfirmation('')
      } else {
        const resultat = await envoyerJson(
          '/api/compte/connexion/',
          {
            email: email.trim(),
            mot_de_passe: motDePasse,
          },
          csrf
        )

        setUtilisateur(resultat.utilisateur)
        onSessionChange?.(resultat.utilisateur)
        setMotDePasse('')
        setMessage('Connexion réussie.')
        await chargerReservations()
      }
    } catch (e) {
      setErreur(e.message || 'Une erreur est survenue.')
    } finally {
      setEnvoi(false)
    }
  }

  async function seDeconnecter() {
    setErreur('')
    setMessage('')
    setEnvoi(true)

    try {
      // La connexion renouvelle le jeton CSRF : on en demande un nouveau.
      const csrf = await obtenirCsrf()

      await envoyerJson(
        '/api/compte/deconnexion/',
        {},
        csrf
      )

      setUtilisateur(null)
      onSessionChange?.(null)
      setReservations([])
      setMode('connexion')
      setMessage('Tu es maintenant déconnecté.')
    } catch (e) {
      setErreur(e.message || 'La déconnexion a échoué.')
    } finally {
      setEnvoi(false)
    }
  }

  function changerMode(nouveauMode) {
    setMode(nouveauMode)
    setErreur('')
    setMessage('')
    setMotDePasse('')
    setConfirmation('')
  }

  return (
    <>
      <button
        type="button"
        className="bouton-compte"
        onClick={() => setOuvert(true)}
      >
        {utilisateur
          ? `Bonjour ${utilisateur.prenom || utilisateur.nom}`
          : 'Mon compte'}
      </button>

      {ouvert && (
        <div
          className="compte-fond"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOuvert(false)
          }}
        >
          <section
            className="compte-fenetre"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compte-titre"
          >
            <button
              type="button"
              className="compte-fermer"
              aria-label="Fermer"
              onClick={() => setOuvert(false)}
            >
              ×
            </button>

            <div className="compte-entete">
              <span className="compte-surtitre">ARTEVENT · ESPACE CLIENT</span>
              <h2 id="compte-titre">
                {utilisateur ? 'Mon espace' : 'Bienvenue'}
              </h2>
              <p>
                {utilisateur
                  ? 'Retrouve ici les informations de ton compte et tes réservations.'
                  : 'Connecte-toi ou crée ton compte pour retrouver tes réservations.'}
              </p>
            </div>

            {erreur && (
              <p className="compte-alerte compte-erreur" role="alert">
                {erreur}
              </p>
            )}

            {message && (
              <p className="compte-alerte compte-succes" role="status">
                {message}
              </p>
            )}

            {!utilisateur ? (
              <>
                <div className="compte-onglets">
                  <button
                    type="button"
                    className={mode === 'connexion' ? 'selectionne' : ''}
                    onClick={() => changerMode('connexion')}
                  >
                    Connexion
                  </button>
                  <button
                    type="button"
                    className={mode === 'inscription' ? 'selectionne' : ''}
                    onClick={() => changerMode('inscription')}
                  >
                    Inscription
                  </button>
                </div>

                <form className="compte-formulaire" onSubmit={traiterFormulaire}>
                  {mode === 'inscription' && (
                    <>
                      <label htmlFor="compte-nom">Nom</label>
                      <input
                        id="compte-nom"
                        autoComplete="family-name"
                        required
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                      />

                      <label htmlFor="compte-prenom">Prénom</label>
                      <input
                        id="compte-prenom"
                        autoComplete="given-name"
                        required
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                      />
                    </>
                  )}

                  <label htmlFor="compte-email">Adresse e-mail</label>
                  <input
                    id="compte-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <label htmlFor="compte-mot-de-passe">Mot de passe</label>
                  <input
                    id="compte-mot-de-passe"
                    type="password"
                    autoComplete={
                      mode === 'inscription'
                        ? 'new-password'
                        : 'current-password'
                    }
                    required
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                  />

                  {mode === 'inscription' && (
                    <>
                      <label htmlFor="compte-confirmation">
                        Confirmer le mot de passe
                      </label>
                      <input
                        id="compte-confirmation"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                      />
                    </>
                  )}

                  <button
                    type="submit"
                    className="compte-bouton-principal"
                    disabled={envoi}
                  >
                    {envoi
                      ? 'Patiente un instant...'
                      : mode === 'inscription'
                        ? 'Créer mon compte'
                        : 'Me connecter'}
                  </button>
                </form>
              </>
            ) : (
              <div className="compte-connecte">
                <div className="compte-profil">
                  <span className="compte-avatar">
                    {(utilisateur.prenom || utilisateur.nom || 'C')
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <div>
                    <strong>
                      {[utilisateur.prenom, utilisateur.nom]
                        .filter(Boolean)
                        .join(' ')}
                    </strong>
                    <span>{utilisateur.email}</span>
                  </div>
                </div>

                <div className="compte-reservations-entete">
                  <h3>Mes réservations</h3>
                  <button
                    type="button"
                    onClick={chargerReservations}
                    disabled={chargement}
                  >
                    {chargement ? 'Chargement...' : 'Actualiser'}
                  </button>
                </div>

                {chargement ? (
                  <p className="compte-texte-secondaire">
                    Chargement des réservations...
                  </p>
                ) : reservations.length === 0 ? (
                  <div className="compte-vide">
                    <span>♫</span>
                    <strong>Aucune réservation à afficher</strong>
                    <p>
                      Tes demandes de réservation apparaîtront ici lorsqu'elles
                      seront associées à ton compte.
                    </p>
                  </div>
                ) : (
                  <div className="compte-liste-reservations">
                    {reservations.map((reservation) => (
                      <article
                        className="compte-reservation"
                        key={reservation.id_reservation}
                      >
                        <div className="compte-reservation-titre">
                          <strong>
                            {reservation.evenement || 'Événement'}
                          </strong>
                          <span>{reservation.statut}</span>
                        </div>

                        <p>
                          {afficherDate(reservation.date_evenement)}
                          {' · '}
                          {reservation.categorie || 'Catégorie non précisée'}
                        </p>
                        <p>
                          {reservation.quantite_ticket} ticket(s)
                        </p>

                        {reservation.paiements?.map((paiement, index) => (
                          <div
                            className="compte-paiement"
                            key={`${reservation.id_reservation}-${index}`}
                          >
                            <span>
                              Paiement : {paiement.statut_paiement}
                            </span>
                            <strong>{prixAriary(paiement.montant)}</strong>
                          </div>
                        ))}
                      </article>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="compte-bouton-secondaire"
                  onClick={seDeconnecter}
                  disabled={envoi}
                >
                  {envoi ? 'Déconnexion...' : 'Me déconnecter'}
                </button>
              </div>
            )}

            <p className="compte-bas-fenetre">
              ArtEvent · Les événements artistiques à partager.
            </p>
          </section>
        </div>
      )}
    </>
  )
}
