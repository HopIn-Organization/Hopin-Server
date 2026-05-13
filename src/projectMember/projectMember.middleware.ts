import { Request, Response, NextFunction } from 'express';
import { ProjectMemberRepository } from './projectMember.repository';
import { ProjectRole } from './projectMember.entity';

const projectMemberRepository = new ProjectMemberRepository();

export const requireProjectAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    const rawProjectId = req.params.id ?? req.body?.projectId;
    const projectId = parseInt(rawProjectId as string);

    if (isNaN(projectId)) {
        res.status(400).json({ message: 'projectId is required' });
        return;
    }

    const member = await projectMemberRepository.findByUserAndProject(userId, projectId);
    if (!member || member.role !== ProjectRole.ADMIN) {
        res.status(403).json({ message: 'Forbidden: admin access required' });
        return;
    }

    next();
};
