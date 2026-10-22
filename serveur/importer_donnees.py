import os
import sys
from pathlib import Path
from getpass import getpass

import pymysql
import django

DOSSIER_SERVEUR = Path(__file__).resolve().parent
sys.path.insert(0, str(DOSSIER_SERVEUR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "configuration.settings")
django.setup()

from django.db import transaction
from evenements.models import (
    Organisateur,
    Lieu,
    Evenement,
    Artiste,
    CategorieTicket,
    Client,
    Reservation,
    Paiement,
    Participation,
)


def lire_table(connexion, nom_table):
    with connexion.cursor() as curseur:
        curseur.execute(f"SELECT * FROM `{nom_table}`")
        return curseur.fetchall()


def importer():
    print("Connexion à l'ancienne base MariaDB...")
    utilisateur = input("Utilisateur MariaDB [root] : ").strip() or "root"
    mot_de_passe = getpass("Mot de passe MariaDB (laisser vide si aucun) : ")

    source = pymysql.connect(
        host="127.0.0.1",
        port=3306,
        user=utilisateur,
        password=mot_de_passe,
        database="evenements_artistiques",
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )

    tables = [
        "organisateur",
        "lieu",
        "evenement",
        "artiste",
        "categorie_ticket",
        "client",
        "reservation",
        "paiement",
        "participation",
    ]

    try:
        donnees = {
            table: lire_table(source, table)
            for table in tables
        }

        print("\nDonnées lues depuis MariaDB :")
        for table in tables:
            print(f"  {table} : {len(donnees[table])} ligne(s)")

        confirmation = input(
            "\nL'import remplacera les données actuelles de SQLite. "
            "As-tu effectué la sauvegarde ? Tape IMPORTER pour continuer : "
        )

        if confirmation != "IMPORTER":
            print("Import annulé. Aucune donnée SQLite n'a été modifiée.")
            return


        with transaction.atomic():

            Participation.objects.all().delete()
            Paiement.objects.all().delete()
            Reservation.objects.all().delete()
            CategorieTicket.objects.all().delete()
            Evenement.objects.all().delete()
            Artiste.objects.all().delete()
            Client.objects.all().delete()
            Lieu.objects.all().delete()
            Organisateur.objects.all().delete()

            Organisateur.objects.bulk_create([
                Organisateur(
                    id_organisateur=r["id_organisateur"],
                    nom_organisateur=r["nom_organisateur"],
                    telephone=r["telephone"],
                    email=r["email"],
                )
                for r in donnees["organisateur"]
            ])

            Lieu.objects.bulk_create([
                Lieu(
                    id_lieu=r["id_lieu"],
                    nom_lieu=r["nom_lieu"],
                    adresse=r["adresse"],
                    capacite_max=r["capacite_max"],
                )
                for r in donnees["lieu"]
            ])

            Evenement.objects.bulk_create([
                Evenement(
                    id_evenement=r["id_evenement"],
                    nom_evenement=r["nom_evenement"],
                    date_evenement=str(r["date_evenement"]),
                    heure_evenement=str(r["heure_evenement"]),
                    description=r["description"],
                    type_evenement=r["type_evenement"],
                    lieu_id=r["id_lieu"],
                    organisateur_id=r["id_organisateur"],
                )
                for r in donnees["evenement"]
            ])

            Artiste.objects.bulk_create([
                Artiste(
                    id_artiste=r["id_artiste"],
                    nom_artiste=r["nom_artiste"],
                    genre_artistique=r["genre_artistique"],
                    telephone=r["telephone"],
                    email=r["email"],
                )
                for r in donnees["artiste"]
            ])

            CategorieTicket.objects.bulk_create([
                CategorieTicket(
                    id_categorie=r["id_categorie"],
                    nom_categorie=r["nom_categorie"],
                    prix=r["prix"],
                    nombre_places=r["nombre_places"],
                    evenement_id=r["id_evenement"],
                )
                for r in donnees["categorie_ticket"]
            ])

            Client.objects.bulk_create([
                Client(
                    id_client=r["id_client"],
                    nom=r["nom"],
                    prenom=r["prenom"],
                    telephone=r["telephone"],
                    email=r["email"],
                )
                for r in donnees["client"]
            ])

            Reservation.objects.bulk_create([
                Reservation(
                    id_reservation=r["id_reservation"],
                    date_reservation=str(r["date_reservation"]),
                    quantite_ticket=r["quantite_ticket"],
                    statut=r["statut"],
                    client_id=r["id_client"],
                    categorie_id=r["id_categorie"],
                )
                for r in donnees["reservation"]
            ])

            Paiement.objects.bulk_create([
                Paiement(
                    id_paiement=r["id_paiement"],
                    montant=r["montant"],
                    date_paiement=(
                        str(r["date_paiement"])
                        if r["date_paiement"] is not None
                        else None
                    ),
                    mode_paiement=r["mode_paiement"],
                    statut_paiement=r["statut_paiement"],
                    reservation_id=r["id_reservation"],
                )
                for r in donnees["paiement"]
            ])

            Participation.objects.bulk_create([
                Participation(
                    artiste_id=r["id_artiste"],
                    evenement_id=r["id_evenement"],
                )
                for r in donnees["participation"]
            ])

        print("\nImportation terminée avec succès.")
        print("Vérification des données dans SQLite :")
        print(f"  Organisateurs : {Organisateur.objects.count()}")
        print(f"  Lieux : {Lieu.objects.count()}")
        print(f"  Événements : {Evenement.objects.count()}")
        print(f"  Artistes : {Artiste.objects.count()}")
        print(f"  Catégories de tickets : {CategorieTicket.objects.count()}")
        print(f"  Clients : {Client.objects.count()}")
        print(f"  Réservations : {Reservation.objects.count()}")
        print(f"  Paiements : {Paiement.objects.count()}")
        print(f"  Participations : {Participation.objects.count()}")

    finally:
        source.close()


if __name__ == "__main__":
    try:
        importer()
    except Exception as erreur:
        print("\nÉCHEC DE L'IMPORTATION :", erreur)
        print(
            "Vérifie le nom de la base, les identifiants MariaDB "
            "et la structure des tables."
        )
        print(
            "Si l'erreur survient pendant la transaction SQLite, "
            "ses modifications sont normalement annulées."
        )
