
from django.urls import path

from . import views
from . import auth_views

urlpatterns = [
    path("", views.accueil, name="accueil"),

    path("api/etat/", views.etat_api, name="etat_api"),

    path(
        "api/evenements/",
        views.liste_evenements_api,
        name="liste_evenements_api",
    ),

    path(
        "api/csrf/",
        views.csrf_token_api,
        name="csrf_token_api",
    ),

    path(
        "api/reservations/",
        views.reservation_api,
        name="reservation_api",
    ),

    # Gestion des comptes clients
    path(
        "api/compte/inscription/",
        auth_views.inscription_api,
        name="inscription_api",
    ),
    path(
        "api/compte/connexion/",
        auth_views.connexion_api,
        name="connexion_api",
    ),
    path(
        "api/compte/session/",
        auth_views.session_api,
        name="session_api",
    ),
    path(
        "api/compte/deconnexion/",
        auth_views.deconnexion_api,
        name="deconnexion_api",
    ),
    path(
        "api/compte/reservations/",
        auth_views.mes_reservations_api,
        name="mes_reservations_api",
    ),
]
