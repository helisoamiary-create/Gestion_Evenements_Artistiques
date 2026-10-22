
from django.db import models
from django.core.validators import MinValueValidator


class Organisateur(models.Model):
    id_organisateur = models.AutoField(
        primary_key=True,
        db_column='id_organisateur',
    )
    nom_organisateur = models.CharField(max_length=100)
    telephone = models.CharField(
        max_length=20, unique=True, null=True, blank=True
    )
    email = models.EmailField(
        max_length=100, unique=True, null=True, blank=True
    )

    class Meta:
        db_table = 'organisateur'

    def __str__(self):
        return self.nom_organisateur


class Lieu(models.Model):
    id_lieu = models.AutoField(
        primary_key=True,
        db_column='id_lieu',
    )
    nom_lieu = models.CharField(max_length=100)
    adresse = models.CharField(max_length=150)
    capacite_max = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
    )

    class Meta:
        db_table = 'lieu'
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(capacite_max__gt=0)
                    | models.Q(capacite_max__isnull=True)
                ),
                name='chk_lieu_capacite',
            ),
        ]

    def __str__(self):
        return self.nom_lieu


class Evenement(models.Model):
    id_evenement = models.AutoField(
        primary_key=True,
        db_column='id_evenement',
    )
    nom_evenement = models.CharField(max_length=100)
    date_evenement = models.DateField()
    heure_evenement = models.TimeField()
    description = models.TextField(null=True, blank=True)
    type_evenement = models.CharField(max_length=50)

    lieu = models.ForeignKey(
        Lieu,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='id_lieu',
        related_name='evenements',
    )
    organisateur = models.ForeignKey(
        Organisateur,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='id_organisateur',
        related_name='evenements',
    )

    class Meta:
        db_table = 'evenement'

    def __str__(self):
        return self.nom_evenement


class Artiste(models.Model):
    id_artiste = models.AutoField(
        primary_key=True,
        db_column='id_artiste',
    )
    nom_artiste = models.CharField(max_length=100)
    genre_artistique = models.CharField(max_length=50)
    telephone = models.CharField(
        max_length=20, unique=True, null=True, blank=True
    )
    email = models.EmailField(
        max_length=100, unique=True, null=True, blank=True
    )

    evenements = models.ManyToManyField(
        Evenement,
        through='Participation',
        related_name='artistes',
        blank=True,
    )

    class Meta:
        db_table = 'artiste'

    def __str__(self):
        return self.nom_artiste


class CategorieTicket(models.Model):
    id_categorie = models.AutoField(
        primary_key=True,
        db_column='id_categorie',
    )
    nom_categorie = models.CharField(max_length=50)
    prix = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0.01)],
    )
    nombre_places = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
    )
    evenement = models.ForeignKey(
        Evenement,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='id_evenement',
        related_name='categories_tickets',
    )

    class Meta:
        db_table = 'categorie_ticket'
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(prix__gt=0)
                    | models.Q(prix__isnull=True)
                ),
                name='chk_categorie_prix',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(nombre_places__gt=0)
                    | models.Q(nombre_places__isnull=True)
                ),
                name='chk_categorie_places',
            ),
        ]

    def __str__(self):
        return self.nom_categorie


class Client(models.Model):
    id_client = models.AutoField(
        primary_key=True,
        db_column='id_client',
    )
    nom = models.CharField(max_length=50)
    prenom = models.CharField(max_length=50)
    telephone = models.CharField(
        max_length=20, unique=True, null=True, blank=True
    )
    email = models.EmailField(
        max_length=100, unique=True, null=True, blank=True
    )

    class Meta:
        db_table = 'client'

    def __str__(self):
        return f'{self.prenom} {self.nom}'


class Reservation(models.Model):
    id_reservation = models.AutoField(
        primary_key=True,
        db_column='id_reservation',
    )
    date_reservation = models.DateField()
    quantite_ticket = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
    )
    statut = models.CharField(max_length=20)
    client = models.ForeignKey(
        Client,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='id_client',
        related_name='reservations',
    )
    categorie = models.ForeignKey(
        CategorieTicket,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='id_categorie',
        related_name='reservations',
    )

    class Meta:
        db_table = 'reservation'
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(quantite_ticket__gt=0)
                    | models.Q(quantite_ticket__isnull=True)
                ),
                name='chk_reservation_quantite',
            ),
        ]

    def __str__(self):
        return f'Réservation n° {self.id_reservation}'


class Paiement(models.Model):
    id_paiement = models.AutoField(
        primary_key=True,
        db_column='id_paiement',
    )
    montant = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    date_paiement = models.DateField(null=True, blank=True)
    mode_paiement = models.CharField(
        max_length=30, null=True, blank=True
    )
    statut_paiement = models.CharField(
        max_length=20, null=True, blank=True
    )
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='id_reservation',
        related_name='paiements',
    )

    class Meta:
        db_table = 'paiement'

    def __str__(self):
        return f'Paiement n° {self.id_paiement}'


class Participation(models.Model):
    pk = models.CompositePrimaryKey('artiste', 'evenement')

    artiste = models.ForeignKey(
        Artiste,
        on_delete=models.PROTECT,
        db_column='id_artiste',
        related_name='participations',
    )
    evenement = models.ForeignKey(
        Evenement,
        on_delete=models.PROTECT,
        db_column='id_evenement',
        related_name='participations',
    )

    class Meta:
        db_table = 'participation'

    def __str__(self):
        return f'{self.artiste} - {self.evenement}'
