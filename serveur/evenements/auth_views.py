
import json

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from .models import Client


User = get_user_model()


def lire_json(request):
    """Lire et vérifier les données JSON reçues."""
    try:
        donnees = json.loads(request.body or b"{}")
        if not isinstance(donnees, dict):
            return None
        return donnees
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def reponse_erreur(message, statut=400):
    return JsonResponse(
        {"succes": False, "message": message},
        status=statut,
    )


@require_POST
def inscription_api(request):
    donnees = lire_json(request)
    if donnees is None:
        return reponse_erreur("Les données envoyées sont invalides.")

    nom = str(donnees.get("nom", "")).strip()
    prenom = str(donnees.get("prenom", "")).strip()
    email = str(donnees.get("email", "")).strip().lower()
    mot_de_passe = donnees.get("mot_de_passe", "")
    confirmation = donnees.get("confirmation_mot_de_passe", "")

    if not nom or not prenom or not email:
        return reponse_erreur(
            "Le nom, le prénom et l'adresse e-mail sont obligatoires."
        )

    if not isinstance(mot_de_passe, str) or not mot_de_passe:
        return reponse_erreur("Le mot de passe est obligatoire.")

    if mot_de_passe != confirmation:
        return reponse_erreur(
            "Les deux mots de passe ne correspondent pas."
        )

    # Ne pas rattacher automatiquement une ancienne réservation
    # à un compte créé simplement avec la même adresse e-mail.
    if Client.objects.filter(email__iexact=email).exists():
        return reponse_erreur(
            "Cette adresse e-mail existe déjà dans les données clients. "
            "Une vérification sera nécessaire avant de créer ou rattacher "
            "un compte. Contactez le responsable du site."
        )

    if User.objects.filter(email__iexact=email).exists():
        return reponse_erreur(
            "Un compte utilise déjà cette adresse e-mail."
        )

    if User.objects.filter(username__iexact=email).exists():
        return reponse_erreur(
            "Cette adresse ne peut pas être utilisée comme identifiant."
        )

    utilisateur = User(
        username=email,
        email=email,
        first_name=prenom,
        last_name=nom,
    )

    try:
        validate_password(mot_de_passe, user=utilisateur)
    except ValidationError as erreur:
        return reponse_erreur(" ".join(erreur.messages))

    try:
        with transaction.atomic():
            utilisateur.set_password(mot_de_passe)
            utilisateur.save()

            Client.objects.create(
                user=utilisateur,
                nom=nom,
                prenom=prenom,
                email=email,
            )
    except Exception:
        # La transaction annule aussi la création du compte si
        # la création du profil client échoue.
        return reponse_erreur(
            "La création du compte a échoué. Vérifiez les données "
            "et réessayez.",
            statut=400,
        )

    return JsonResponse(
        {
            "succes": True,
            "message": "Votre compte a été créé. Vous pouvez vous connecter.",
        },
        status=201,
    )


@require_POST
def connexion_api(request):
    donnees = lire_json(request)
    if donnees is None:
        return reponse_erreur("Les données envoyées sont invalides.")

    email = str(donnees.get("email", "")).strip().lower()
    mot_de_passe = donnees.get("mot_de_passe", "")

    if not email or not isinstance(mot_de_passe, str) or not mot_de_passe:
        return reponse_erreur(
            "L'adresse e-mail et le mot de passe sont obligatoires."
        )

    utilisateur = authenticate(
        request,
        username=email,
        password=mot_de_passe,
    )

    if utilisateur is None:
        return reponse_erreur(
            "Adresse e-mail ou mot de passe incorrect.",
            statut=401,
        )

    if not utilisateur.is_active:
        return reponse_erreur(
            "Ce compte est désactivé.",
            statut=403,
        )

    # L'espace client ne doit pas servir de connexion à l'administration.
    if utilisateur.is_staff or utilisateur.is_superuser:
        return reponse_erreur(
            "Utilisez l'accès réservé à l'administration.",
            statut=403,
        )

    if not hasattr(utilisateur, "client_profile"):
        return reponse_erreur(
            "Aucun profil client n'est associé à ce compte.",
            statut=403,
        )

    login(request, utilisateur)

    return JsonResponse(
        {
            "succes": True,
            "message": "Connexion réussie.",
            "utilisateur": {
                "nom": utilisateur.last_name,
                "prenom": utilisateur.first_name,
                "email": utilisateur.email,
            },
        }
    )


@require_GET
def session_api(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"connecte": False, "utilisateur": None}
        )

    utilisateur = request.user

    if not hasattr(utilisateur, "client_profile"):
        return JsonResponse(
            {"connecte": False, "utilisateur": None}
        )

    client = utilisateur.client_profile

    return JsonResponse(
        {
            "connecte": True,
            "utilisateur": {
                "nom": client.nom,
                "prenom": client.prenom,
                "email": client.email,
            },
        }
    )


@require_POST
def deconnexion_api(request):
    logout(request)
    return JsonResponse(
        {"succes": True, "message": "Déconnexion réussie."}
    )


@require_GET
def mes_reservations_api(request):
    if not request.user.is_authenticated:
        return reponse_erreur(
            "Connectez-vous pour consulter vos réservations.",
            statut=401,
        )

    try:
        client = request.user.client_profile
    except Client.DoesNotExist:
        return reponse_erreur(
            "Aucun profil client n'est associé à ce compte.",
            statut=403,
        )

    reservations = (
        client.reservations
        .select_related("categorie__evenement")
        .prefetch_related("paiements")
        .order_by("-date_reservation", "-id_reservation")
    )

    resultat = []

    for reservation in reservations:
        categorie = reservation.categorie
        evenement = categorie.evenement if categorie else None

        resultat.append(
            {
                "id_reservation": reservation.id_reservation,
                "date_reservation": (
                    reservation.date_reservation.isoformat()
                    if reservation.date_reservation
                    else None
                ),
                "quantite_ticket": reservation.quantite_ticket,
                "statut": reservation.statut,
                "evenement": (
                    evenement.nom_evenement if evenement else None
                ),
                "date_evenement": (
                    evenement.date_evenement.isoformat()
                    if evenement and evenement.date_evenement
                    else None
                ),
                "categorie": (
                    categorie.nom_categorie if categorie else None
                ),
                "paiements": [
                    {
                        "montant": (
                            str(paiement.montant)
                            if paiement.montant is not None
                            else None
                        ),
                        "mode_paiement": paiement.mode_paiement,
                        "statut_paiement": paiement.statut_paiement,
                        "date_paiement": (
                            paiement.date_paiement.isoformat()
                            if paiement.date_paiement
                            else None
                        ),
                    }
                    for paiement in reservation.paiements.all()
                ],
            }
        )

    return JsonResponse(
        {"succes": True, "reservations": resultat}
    )
