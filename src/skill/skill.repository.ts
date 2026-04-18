import { Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { Skill } from "../database/entities/skill.entity";

export class SkillRepository {
    private repository: Repository<Skill>;

    constructor() {
        this.repository = AppDataSource.getRepository(Skill);
    }

    async findOrCreate(skillData: Partial<Skill>): Promise<Skill> {
        if (!skillData.name) throw new Error("Skill name is required");

        let skill = await this.repository.findOne({ where: { name: skillData.name } });

        if (!skill) {
            skill = this.repository.create(skillData);
            skill = await this.repository.save(skill);
        }

        return skill;
    }
}