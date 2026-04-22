import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { User } from "../database/entities/user.entity";
import { Project } from "../project/project.entity";
import { Job } from "../job/job.entity";


export enum ProjectRole {
    TRAINEE = "trainee",
    ADMIN = "admin",
}

@Entity({ name: "project_members" })
export class ProjectMember {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, (user) => user.projectMemberships)
    user!: User;

    @ManyToOne(() => Project, (project) => project.members)
    project!: Project;

    @RelationId((member: ProjectMember) => member.project)
    projectId!: number;

    @Column({
        type: "enum",
        enum: ProjectRole,
        default: ProjectRole.TRAINEE,
    })
    role!: ProjectRole;

    @ManyToOne(() => Job, (job) => job.members, {
        nullable: false,
        onDelete: "RESTRICT",
    })
    job!: Job;
}