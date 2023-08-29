from __future__ import annotations

import binascii
import json
import os
import random
from string import ascii_lowercase, digits
from typing import Union

import pysodium
from django.conf import settings
from pysodium import crypto_box_keypair, randombytes, crypto_box_NONCEBYTES, crypto_box

from establishment.utils.convert import bytes_to_hex, hex_to_bytes
from establishment.utils.errors import InternalServerError


def sign_message(message: bytes, private_key: bytes) -> str:
    signature = pysodium.crypto_sign_detached(message, private_key)
    return bytes_to_hex(signature)


def verify_signature(signature: bytes, message: bytes, public_key: bytes):
    pysodium.crypto_sign_verify_detached(signature, message, public_key)


def decrypt(message: bytes, nonce: bytes, sender_public_key: bytes, receiver_private_key: bytes) -> bytes:
    return pysodium.crypto_box_open(message, nonce, sender_public_key, receiver_private_key)


def generate_secure_code(length: int) -> str:
    return binascii.hexlify(os.urandom(length // 2)).decode()


def generate_digits_code() -> str:
    return str(random.randrange(1000000, 2000000))[1:]


alphanum_alphabet = digits + ascii_lowercase


def generate_alphanum_8_char_code() -> str:
    code = ""
    while len(code) < 8:
        # Chance is 36/64 to hit a valid index, so on average this will take one step (9/16 correct on average).
        random_bytes = list(os.urandom(16))
        for b in random_bytes:
            b = b >> 2
            if b < 36:
                code += alphanum_alphabet[b]
    return code[:8]


# Generate a uid from 4 bytes of timestamp and 12 bytes of os.random
# Return a 32 byte hex
def timed_uid() -> str:
    import time
    now = int(time.time())
    timestamp_bytes = now.to_bytes(4, byteorder="big")
    random_bytes = os.urandom(12)
    return bytes_to_hex(timestamp_bytes + random_bytes)


# Add as bytes the values in args, and computes SHA3. Optionally converts string and then bytes if needed.
def sha3_to_hex(*args: Union[int, str, bytes]) -> str:
    import hashlib
    h = hashlib.sha3_256()

    for arg in args:
        b = arg
        if not isinstance(b, bytes):
            b = str(b).encode()
        h.update(b)

    return h.hexdigest()


# TODO @branch @cleanup use this for CDS payment methods as well
def decrypt_from_db(value: str) -> dict:
    # Intentionally don't handle errors, any error in decrypting this information should
    # result in an Internal Server Error.
    ciphertext_hex, nonce_hex, sender_public_key_hex = value.split(";")
    # We don't really care about the sender's public key here, since this is only used in
    # endpoints that require user authentication anyways. We are only interested in the
    # encryption side of the box, not authentication. The frontend will just generate a
    # keypair for every request. This transforms the Crypto Box algorithm into a Hybrid ECIES scheme, see:
    # https://cryptobook.nakov.com/asymmetric-key-ciphers/ecies-public-key-encryption
    plaintext_bytes = decrypt(hex_to_bytes(ciphertext_hex),
                              hex_to_bytes(nonce_hex),
                              hex_to_bytes(sender_public_key_hex),
                              hex_to_bytes(settings.SECRETS.INTERNAL_ENCRYPTION_PRIVATE_KEY))
    plaintext = plaintext_bytes.decode()
    return json.loads(plaintext)


def encrypt_for_db(data: dict) -> str:
    value_b = json.dumps(data).encode()

    once_public_key, once_secret_key = crypto_box_keypair()
    nonce = randombytes(crypto_box_NONCEBYTES)

    cypher_text = crypto_box(value_b, nonce, hex_to_bytes(settings.SECRETS.INTERNAL_ENCRYPTION_PUBLIC_KEY), once_secret_key)

    str_value = f"{bytes_to_hex(cypher_text)};{bytes_to_hex(nonce)};{bytes_to_hex(once_public_key)}"

    # Test here that we can actually decrypt the information
    decrypted_data = decrypt_from_db(str_value)
    if decrypted_data != data:
        raise InternalServerError

    return str_value
