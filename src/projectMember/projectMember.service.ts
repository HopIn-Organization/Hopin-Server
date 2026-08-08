import { AppDataSource } from '../database/data-source';
import { ProjectMember, ProjectRole } from './projectMember.entity';
import { ProjectMemberRepository } from './projectMember.repository';
import { OnBoarding } from '../onboarding/onBoarding.entity';

export class ProjectMemberService {
  private projectMemberRepository: ProjectMemberRepository;

  constructor() {
    this.projectMemberRepository = new ProjectMemberRepository();
  }

  async addMember(
    projectId: number,
    userId: number,
    jobId: number,
    role?: ProjectRole
  ): Promise<ProjectMember> {
    return this.projectMemberRepository.create({
      projectId,
      userId,
      jobId,
      role,
    });
  }

  async updateMemberRole(
    projectId: number,
    memberId: number,
    role: ProjectRole
  ): Promise<ProjectMember> {
    const member = await this.projectMemberRepository.findByProjectAndId(
      projectId,
      memberId
    );

    if (!member) {
      throw new Error('Project member not found');
    }

    member.role = role;
    return this.projectMemberRepository.save(member);
  }

  async removeMember(memberId: number): Promise<void> {
    await AppDataSource.transaction(async manager => {
      const member = await manager.getRepository(ProjectMember).findOne({
        where: { id: memberId },
        relations: { user: true, job: true },
      });

      if (!member) {
        throw new Error('Project member not found');
      }

      const onboarding = await manager.getRepository(OnBoarding).findOne({
        where: { user: { id: member.user.id }, job: { id: member.job.id } },
        select: { id: true },
      });

      if (onboarding) {
        await manager.query(
          `WITH RECURSIVE onboarding_tasks AS (
            SELECT id FROM task WHERE onboarding_id = $1
            UNION ALL
            SELECT t.id FROM task t
            JOIN onboarding_tasks ot ON t.parent_id = ot.id
          )
          DELETE FROM task WHERE id IN (SELECT id FROM onboarding_tasks)`,
          [onboarding.id]
        );

        await manager.getRepository(OnBoarding).delete(onboarding.id);
      }

      const result = await manager
        .getRepository(ProjectMember)
        .delete(memberId);

      if ((result.affected ?? 0) === 0) {
        throw new Error('Project member not found');
      }
    });
  }
}
