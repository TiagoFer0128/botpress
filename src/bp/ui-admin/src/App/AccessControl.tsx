import { checkRule } from 'common/auth'
import { connect } from 'react-redux'
import store from '~/store'

import { fetchPermissions } from '../reducers/user'

export interface PermissionAllowedProps {
  /** The resource to check permissions. Ex: module.qna */
  resource: string
  /** The operation to check */
  operation: 'read' | 'write'
  /** Should the user be a super admin to see this? */
  superAdmin?: boolean
}

export type AccessControlProps = {
  /** Component to display if user has the right access */
  readonly children: React.ReactNode
  /** Optionally set a fallback component if no access */
  readonly fallback?: React.ReactNode
} & PermissionAllowedProps

export const isOperationAllowed = (params: PermissionAllowedProps) => {
  const profile = store.getState().user.profile
  if (!profile) {
    return false
  }

  if (profile.isSuperAdmin) {
    return true
  }

  if (params.superAdmin) {
    return false
  }

  if (profile.permissions && !checkRule(profile.permissions, params.operation, params.resource)) {
    return false
  }

  return true
}

export const isChatUser = (): boolean => {
  const permissions = store.getState().user.permissions
  return permissions && !!permissions.find(p => p.res.startsWith('chatuser'))
}

const PermissionsChecker = (props: AccessControlProps) => {
  const { resource, operation, superAdmin, children, fallback = null } = props
  return isOperationAllowed({ resource, operation, superAdmin }) ? children : (fallback as any)
}

const mapStateToProps = state => ({ permissions: state.user.permissions, test: state.user })

export default connect(
  mapStateToProps,
  { fetchPermissions }
)(PermissionsChecker)
