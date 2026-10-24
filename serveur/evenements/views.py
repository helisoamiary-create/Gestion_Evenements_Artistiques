
import json
from decimal import Decimal, InvalidOperation

from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from django.db.models import F
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie

from django.utils import timezone

from .models import (
    Evenement,
    CategorieTicket,
    Client,
    Reservation,
    Paiement,
)


class ErreurReservation(Exception):
    """Erreur métier renvoyée au visiteur lors d'une réservation."""


def accueil(request):
    return HttpResponse(
        "<h1>Gestion des événements artistiques</h1>"
        "<p>Bienvenue sur notre plateforme !</p>"
    )


def etat_api(request):
    return JsonResponse({
        "application": "ArtEvent",
        "statut": "operationnel",
        "message": "Bienvenue sur notre plateforme !",
    })


def liste_evenements_api(request):
    evenements = (
        Evenement.objects
        .select_related("lieu", "organisateur")
        .prefetch_related("categories_tickets", "artistes")
        .order_by("date_evenement", "heure_evenement")
    )

    donnees = []

    for evenement in evenements:
        categories = [
            {
                "id": categorie.id_categorie,
                "nom": categorie.nom_categorie,
                "prix": (
                    str(categorie.prix)
                    if categorie.prix is not None
                    else None
                ),
                "places_disponibles": categorie.nombre_places,
            }
            for categorie in evenement.categories_tickets.all()
        ]

        donnees.append({
            "id": evenement.id_evenement,
            "titre": evenement.nom_evenement,
            "date": evenement.date_evenement,
            "heure": evenement.heure_evenement,
            "description": evenement.description,
            "type": evenement.type_evenement,
            "lieu": evenement.lieu.nom_lieu if evenement.lieu else None,
            "adresse": evenement.lieu.adresse if evenement.lieu else None,
            "organisateur": (
                evenement.organisateur.nom_organisateur
                if evenement.organisateur else None
            ),
            "artistes": [
                artiste.nom_artiste
                for artiste in evenement.artistes.all()
            ],
            "categories": categories,
        })

    return JsonResponse(donnees, safe=False)


@ensure_csrf_cookie
def csrf_token_api(request):
    """Fournit le jeton de sécurité nécessaire à l'envoi du formulaire."""
    return JsonResponse({"csrfToken": get_token(request)})


def reservation_api(request):
    if request.method != "POST":
        return JsonResponse(
            {"erreur": "Cette adresse accepte uniquement les réservations envoyées en POST."},
            status=405,
        )

    try:
        donnees = json.loads(request.body.decode("utf-8"))

        id_evenement = int(donnees.get("id_evenement"))
        id_categorie = int(donnees.get("id_categorie"))
        quantite = int(donnees.get("quantite"))

        nom = str(donnees.get("nom", "")).strip()
        prenom = str(donnees.get("prenom", "")).strip()
        email = str(donnees.get("email", "")).strip().lower()
        telephone = str(donnees.get("telephone", "")).strip() or None

        if quantite < 1:
            raise ErreurReservation(
                "La quantité doit être au moins égale à un ticket."
            )

        if not nom or not prenom or not email:
            raise ErreurReservation(
                "Le nom, le prénom et l'adresse e-mail sont obligatoires."
            )

        try:
            validate_email(email)
        except ValidationError:
            raise ErreurReservation(
                "L'adresse e-mail saisie n'est pas valide."
            )

        if len(nom) > 50 or len(prenom) > 50:
            raise ErreurReservation(
                "Le nom et le prénom ne doivent pas dépasser 50 caractères."
            )

        if telephone and len(telephone) > 20:
            raise ErreurReservation(
                "Le numéro de téléphone ne doit pas dépasser 20 caractères."
            )

    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"erreur": "Les données envoyées ne sont pas au format JSON valide."},
            status=400,
        )
    except (TypeError, ValueError):
        return JsonResponse(
            {"erreur": "L'événement, la catégorie et la quantité doivent être valides."},
            status=400,
        )
    except ErreurReservation as erreur:
        return JsonResponse({"erreur": str(erreur)}, status=400)

    try:
        with transaction.atomic():
            evenement = Evenement.objects.filter(
                id_evenement=id_evenement
            ).first()

            if evenement is None:
                raise ErreurReservation("Cet événement n'existe pas.")

            maintenant = timezone.localtime()
            heure_locale = maintenant.time().replace(tzinfo=None)

            if (
                evenement.date_evenement < timezone.localdate()
                or (
                    evenement.date_evenement == timezone.localdate()
                    and evenement.heure_evenement <= heure_locale
                )
            ):
                raise ErreurReservation(
                    "Les réservations sont fermées pour cet événement."
                )

            categorie = CategorieTicket.objects.filter(
                id_categorie=id_categorie,
                evenement_id=id_evenement,
            ).first()

            if categorie is None:
                raise ErreurReservation(
                    "Cette catégorie de tickets n'appartient pas à cet événement."
                )

            if categorie.prix is None or categorie.prix <= Decimal("0"):
                raise ErreurReservation(
                    "Le prix de cette catégorie doit être défini avant la réservation."
                )

            if categorie.nombre_places is None:
                raise ErreurReservation(
                    "Le nombre de places n'est pas renseigné pour cette catégorie."
                )
        
            if request.user.is_authenticated:
                try:
                    client = request.user.client_profile
                except Client.DoesNotExist:
                    raise ErreurReservation(
                        "Aucun profil client n'est associé à ce compte."
                    )


                nom = client.nom
                prenom = client.prenom
                email = client.email

                if client.telephone:
                    telephone = client.telephone

            else:
                client = Client.objects.filter(email__iexact=email).first()

                if client and client.user_id:
                    raise ErreurReservation(
                        "Cette adresse e-mail est liée à un compte. "
                        "Connectez-vous pour poursuivre votre réservation."
                    )

                if client and (
                    client.nom.lower() != nom.lower()
                    or client.prenom.lower() != prenom.lower()
                ):
                    raise ErreurReservation(
                        "Cette adresse e-mail est déjà associée à un autre profil."
                    )

            if telephone:
                autre_client = Client.objects.filter(
                    telephone=telephone
                ).exclude(
                    id_client=client.id_client if client else None
                ).exists()

                if autre_client:
                    raise ErreurReservation(
                        "Ce numéro de téléphone est déjà associé à un autre profil."
                    )


            places_mises_a_jour = CategorieTicket.objects.filter(
                id_categorie=id_categorie,
                evenement_id=id_evenement,
                nombre_places__gte=quantite,
            ).update(
                nombre_places=F("nombre_places") - quantite
            )

            if places_mises_a_jour == 0:
                raise ErreurReservation(
                    "Il n'y a pas assez de places disponibles pour cette quantité."
                )

            if client is None:
                client = Client.objects.create(
                    nom=nom,
                    prenom=prenom,
                    email=email,
                    telephone=telephone,
                )
            elif telephone and not client.telephone:
                client.telephone = telephone
                client.save(update_fields=["telephone"])

            montant_total = categorie.prix * quantite

            reservation = Reservation.objects.create(
                date_reservation=timezone.localdate(),
                quantite_ticket=quantite,
                statut="En attente",
                client=client,
                categorie=categorie,
            )

            Paiement.objects.create(
                montant=montant_total,
                date_paiement=None,
                mode_paiement="Non effectué",
                statut_paiement="En attente",
                reservation=reservation,
            )

        return JsonResponse({
            "message": "La demande de réservation a été enregistrée.",
            "reservation": {
                "id": reservation.id_reservation,
                "evenement": evenement.nom_evenement,
                "categorie": categorie.nom_categorie,
                "quantite": quantite,
                "prix_unitaire": str(categorie.prix),
                "montant_total": str(montant_total),
                "statut": reservation.statut,
                "statut_paiement": "En attente",
            },
        }, status=201)

    except ErreurReservation as erreur:
        return JsonResponse({"erreur": str(erreur)}, status=400)
    except IntegrityError:
        return JsonResponse(
            {
                "erreur": (
                    "Certaines informations sont déjà utilisées. "
                    "Vérifie l'adresse e-mail et le numéro de téléphone."
                )
            },
            status=400,
        )
