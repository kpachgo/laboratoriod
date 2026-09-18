import { useEffect, useRef } from 'react';
import { UploadIcon } from './icons';

/**
 * Selector de fotos con previsualización. No sube nada por sí mismo: el formulario
 * padre guarda los File seleccionados y los sube (POST /pedidos/:id/imagenes) una
 * vez que el pedido ya existe.
 */
export default function PhotoPicker({ files, onChange, label = 'Fotos' }) {
  const inputRef = useRef(null);
  const urlsRef = useRef([]);

  useEffect(() => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = files.map((f) => URL.createObjectURL(f));
    return () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function handleSelect(e) {
    const selected = Array.from(e.target.files || []);
    if (selected.length) onChange([...files, ...selected]);
    e.target.value = '';
  }

  function removeAt(index) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      {label && <label className="field-label">{label}</label>}
      <div className="flex gap-2.5 flex-wrap">
        {files.map((file, i) => (
          <div key={i} className="relative w-[84px] h-[84px] rounded-input overflow-hidden bg-bg group">
            <img src={urlsRef.current[i]} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] leading-5 text-center"
              title="Quitar"
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-[84px] h-[84px] rounded-input border-[1.5px] border-dashed border-dashed flex flex-col items-center justify-center gap-1 text-text-muted flex-shrink-0"
        >
          <UploadIcon />
          <span className="text-[10.5px] font-semibold">Subir foto</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleSelect}
        />
      </div>
    </div>
  );
}
