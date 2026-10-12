import Equipo from '../../components/Equipo'

// Equipo de una empresa desde el panel de plataforma (el superadmin puede todo)
export default function AdminUsuarios({ empresaId }) {
  return <Equipo base={`/admin/empresas/${empresaId}/usuarios`} />
}
