from django.db import models


class Language(models.Model):
    name = models.CharField(max_length=64, unique=True)
    local_name = models.CharField(max_length=64, unique=True)
    # https://en.wikipedia.org/wiki/ISO_639-3
    iso_code = models.CharField(max_length=32, unique=True)

    class Meta:
        db_table = "Language"

    def __str__(self):
        return "Language " + str(self.id) + ": " + self.name + " (" + self.local_name + ") ISO code " + self.iso_code

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "localName": self.local_name,
            "isoCode": self.iso_code,
        }


class Jurisdiction(models.Model):
    name = models.CharField(max_length=64, unique=True)

    class Meta:
        db_table = "Jurisdiction"

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
        }


class TranslationKey(models.Model):
    # TODO: WTF, unique="True", what is this?
    value = models.CharField(max_length=4096, unique="True")
    comment = models.CharField(max_length=4096, null=True, blank=True)

    class Meta:
        db_table = "TranslationKey"

    def __str__(self):
        return "TransationKey " + str(self.id) + ": " + self.value

    def to_json(self):
        rez = {
            "id": self.id,
            "value": self.value,
        }
        if self.comment:
            rez["comment"] = self.comment
        return rez


class TranslationEntry(models.Model):
    key = models.ForeignKey(TranslationKey)
    language = models.ForeignKey(Language, related_name="+")
    value = models.CharField(max_length=4096)

    class Meta:
        db_table = "TranslationEntry"
        unique_together = ("key", "language")

    def __str__(self):
        return "TranslationEntry " + str(self.id) + ": " + self.value

    def to_json(self):
        return {
            "id": self.id,
            "translationKeyId": self.key_id,
            "languageId": self.language_id,
            "value": self.value,
        }
