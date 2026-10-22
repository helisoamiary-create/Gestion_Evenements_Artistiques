from django.contrib import admin

from .models import (
    Organisateur,
    Lieu,
    Evenement,
    Artiste,
    CategorieTicket,
    Client,
    Reservation,
    Paiement,
)


@admin.register(Organisateur)
class OrganisateurAdmin(admin.ModelAdmin):
    list_display = (
        'id_organisateur',
        'nom_organisateur',
        'telephone',
        'email',
    )
    search_fields = ('nom_organisateur', 'telephone', 'email')


@admin.register(Lieu)
class LieuAdmin(admin.ModelAdmin):
    list_display = (
        'id_lieu',
        'nom_lieu',
        'adresse',
        'capacite_max',
    )
    search_fields = ('nom_lieu', 'adresse')


@admin.register(Evenement)
class EvenementAdmin(admin.ModelAdmin):
    list_display = (
        'id_evenement',
        'nom_evenement',
        'date_evenement',
        'heure_evenement',
        'type_evenement',
        'lieu',
        'organisateur',
    )
    list_filter = ('type_evenement', 'date_evenement')
    search_fields = ('nom_evenement', 'type_evenement')
    date_hierarchy = 'date_evenement'


@admin.register(Artiste)
class ArtisteAdmin(admin.ModelAdmin):
    list_display = (
        'id_artiste',
        'nom_artiste',
        'genre_artistique',
        'telephone',
        'email',
    )
    search_fields = ('nom_artiste', 'genre_artistique', 'email')
    exclude = ('evenements',)


@admin.register(CategorieTicket)
class CategorieTicketAdmin(admin.ModelAdmin):
    list_display = (
        'id_categorie',
        'nom_categorie',
        'prix',
        'nombre_places',
        'evenement',
    )
    list_filter = ('nom_categorie',)
    search_fields = ('nom_categorie',)


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = (
        'id_client',
        'nom',
        'prenom',
        'telephone',
        'email',
    )
    search_fields = ('nom', 'prenom', 'telephone', 'email')


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        'id_reservation',
        'date_reservation',
        'quantite_ticket',
        'statut',
        'client',
        'categorie',
    )
    list_filter = ('statut', 'date_reservation')
    search_fields = ('statut',)


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = (
        'id_paiement',
        'montant',
        'date_paiement',
        'mode_paiement',
        'statut_paiement',
        'reservation',
    )
    list_filter = ('mode_paiement', 'statut_paiement')
