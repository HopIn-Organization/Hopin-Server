import { Request, Response } from 'express';
import { ProjectMemberService } from './projectMember.service';

export class ProjectMemberController {
    private projectMemberService: ProjectMemberService;

    constructor() {
        this.projectMemberService = new ProjectMemberService();
    }

    updateMemberRole = async (req: Request, res: Response): Promise<void> => {
        try {
            const projectId = parseInt(req.params.projectId as string);
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