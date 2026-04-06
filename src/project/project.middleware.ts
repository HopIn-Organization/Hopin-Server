import { Request, Response, NextFunction } from 'express';
import { ProjectUserRepository } from './project-user.repository';
import { ProjectRole } from '../database/entities/project-user.entity';

const projectUserRepository = new ProjectUserRepository();

/**
 * Requires the requesting user (identified by x-user-id header) to be an admin of the project.
 * Used for role-sensitive actions like assigning roles.
 */
export const requireProjectAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const rawUserId = req.headers['x-user-id'];
  const requesterId = parseInt(rawUserId as string);

  if (!rawUserId || isNaN(requesterId)) {
    res.status(401).json({ message: 'x-user-id header is required' });
    return;
  }

  const projectId = parseInt(req.params.id as string);
  const membership = await projectUserRepository.findByProjectAndUser(projectId, requesterId);

  if (!membership || membership.role !== ProjectRole.ADMIN) {
    res.status(403).json({ message: 'Admin permission required' });
    return;
  }

  next();
};

/**
 * Requires admin permission unless the project has no members yet (bootstrap: first user).
 * Used for adding users to a project.
 */
export const requireProjectAdminOrBootstrap = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const projectId = parseInt(req.params.id as string);
  const memberCount = await projectUserRepository.countByProject(projectId);

  if (memberCount === 0) {
    // No members yet — allow request so the first user gets admin role
    next();
    return;
  }

  const rawUserId = req.headers['x-user-id'];
  const requesterId = parseInt(rawUserId as string);

  if (!rawUserId || isNaN(requesterId)) {
    res.status(401).json({ message: 'x-user-id header is required' });
    return;
  }

  const membership = await projectUserRepository.findByProjectAndUser(projectId, requesterId);

  if (!membership || membership.role !== ProjectRole.ADMIN) {
    res.status(403).json({ message: 'Admin permission required' });
    return;
  }

  next();
};
