import { Request, Response } from 'express';
import { ProjectMemberService } from './projectMember.service';

export class ProjectMemberController {
    private projectMemberService: ProjectMemberService;

    constructor() {
        this.projectMemberService = new ProjectMemberService();
    }

    addMember = async (req: Request, res: Response): Promise<void> => {
        try {
            const projectId = parseInt(req.params.id as string);
            const { userId, jobId, role } = req.body;

            if (!userId || typeof userId !== 'number') {
                res.status(400).json({ message: 'userId is required' });
                return;
            }

            if (!jobId || typeof jobId !== 'number') {
                res.status(400).json({ message: 'jobId is required' });
                return;
            }

            const member = await this.projectMemberService.addMember(projectId, userId, jobId, role);
            res.status(201).json(member);
        } catch (error) {
            res.status(500).json({ message: 'Error adding member to project' });
        }
    };

    updateMemberRole = async (req: Request, res: Response): Promise<void> => {
        try {
            const projectId = parseInt(req.params.id as string);
            const memberId = parseInt(req.params.memberId as string);
            const { role } = req.body;

            const updatedMember = await this.projectMemberService.updateMemberRole(projectId, memberId, role);

            res.json(updatedMember);
        } catch (error) {
            res.status(500).json({ message: 'Error updating member role' });
        }
    };

    removeMember = async (req: Request, res: Response): Promise<void> => {
        try {
            const memberId = parseInt(req.params.memberId as string);

            await this.projectMemberService.removeMember(memberId);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: 'Error removing member from project' });
        }
    };
}