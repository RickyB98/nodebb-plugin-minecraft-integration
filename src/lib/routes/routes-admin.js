import { addAdminRoute } from './routes-helpers'

import {
  renderAdminPage,
  renderServerEditor,
} from '../controllers'

export default function () {
  addAdminRoute('/admin/plugins/minecraft-integration', renderAdminPage)
  addAdminRoute('/admin/plugins/minecraft-integration/servers', renderAdminPage)
  addAdminRoute('/admin/plugins/minecraft-integration/server/:sid', renderServerEditor)
}
