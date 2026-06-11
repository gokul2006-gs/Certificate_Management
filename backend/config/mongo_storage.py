import mimetypes
import os
from urllib.parse import quote

import certifi
import gridfs
from django.conf import settings
from django.core.files.base import File
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
from pymongo import MongoClient


_client = None
_fs = None


def _mongo_client():
    global _client
    if _client is not None:
        return _client

    mongo_uri = settings.MONGODB_URI
    if mongo_uri:
        _client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
    else:
        host = os.environ.get("MONGODB_HOST", "mongodb://localhost:27017")
        port = int(os.environ.get("MONGODB_PORT", "27017"))
        user = os.environ.get("MONGODB_USER", "").strip()
        password = os.environ.get("MONGODB_PASSWORD", "").strip()
        kwargs = {}
        if user:
            kwargs["username"] = user
        if password:
            kwargs["password"] = password
        _client = MongoClient(host, port=port, **kwargs)

    return _client


def _gridfs():
    global _fs
    if _fs is None:
        database = _mongo_client()[settings.MONGODB_NAME]
        _fs = gridfs.GridFS(database, collection=settings.MONGODB_FILE_BUCKET)
    return _fs


@deconstructible
class MongoGridFSStorage(Storage):
    def _open(self, name, mode="rb"):
        grid_out = _gridfs().get_last_version(filename=name)
        return File(grid_out, name=name)

    def _save(self, name, content):
        self.delete(name)
        content.seek(0)
        content_type = getattr(content, "content_type", None) or mimetypes.guess_type(name)[0]
        _gridfs().put(
            content,
            filename=name,
            content_type=content_type or "application/octet-stream",
        )
        return name

    def delete(self, name):
        fs = _gridfs()
        for grid_file in fs.find({"filename": name}):
            fs.delete(grid_file._id)

    def exists(self, name):
        return _gridfs().exists({"filename": name})

    def size(self, name):
        return _gridfs().get_last_version(filename=name).length

    def url(self, name):
        return f"{settings.MEDIA_URL}{quote(name)}"

    def get_available_name(self, name, max_length=None):
        return name
