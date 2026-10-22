
from django.urls import path
from . import views

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
]
