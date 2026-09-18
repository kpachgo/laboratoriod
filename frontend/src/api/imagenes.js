import api from './client';

export async function subirImagenes(pedidoId, files, descripcion) {
  for (const file of files) {
    const formData = new FormData();
    formData.append('imagen', file);
    if (descripcion) formData.append('descripcion', descripcion);
    await api.post(`/pedidos/${pedidoId}/imagenes`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
}
