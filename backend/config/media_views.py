import mimetypes

from django.core.files.storage import default_storage
from django.http import FileResponse, Http404


def serve_media_file(request, path):
    if not default_storage.exists(path):
        raise Http404("Media file not found")

    file_handle = default_storage.open(path, "rb")
    content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return FileResponse(file_handle, content_type=content_type)
