import { ProjectMember, ProjectRole } from "./projectMember.entity";
import { ProjectMemberRepository } from "./projectMember.repository";

export class ProjectMemberService {
    private projectMemberRepository: ProjectMemberRepository;

    constructor() {
        this.projectMemberRepository = new ProjectMemberRepository();
    }

    async updateMemberRole(projectId: number, memberId: number, role: ProjectRole): Promise<ProjectMember> {
        const member = await this.projectMemberRepository.findByProjectAndId(
            projectId,
            memberId
        );

        if (!member) {
            throw new Error("Project member not found");
        }

        member.role = role;
        return this.projectMemberRepository.save(member);
    }

    async removeMember(memberId: number): Promise<void> {
        const deleted = await this.projectMemberRepository.delete(memberId);


        if (!deleted) {
            throw new Error("Project member not found");
        }
    }
}