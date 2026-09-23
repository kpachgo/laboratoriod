import Layout from '../components/Layout';

export default function Reportes() {
  return (
    <Layout>
      <div className="font-display text-[22px] font-semibold">Reportes</div>
      <div className="card p-6 sm:p-8 flex-grow flex items-center justify-center text-center text-text-muted text-sm">
        Próximamente: reportes de producción, tiempos de entrega y carga por técnico.
      </div>
    </Layout>
  );
}
