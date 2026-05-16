import { Request, Response } from 'express';
import { UserRepository } from '../user/user.repository';
import { SkillRepository } from '../skill/skill.repository';

function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function toProfileResponse(user: { id: number; name: string; email: string; birthDate?: string | null; workExperience?: Array<{ id: string; title: string; years: number }>; skills?: Array<{ name: string }> }) {
  return {
    id: String(user.id),
    fullName: user.name,
    email: user.email,
    birthDate: user.birthDate ?? '',
    avatarInitials: getAvatarInitials(user.name),
    keySkills: user.skills?.map((s) => s.name) ?? [],
    workExperience: user.workExperience ?? [],
  };
}

export class ProfileController {
  private userRepository: UserRepository;
  private skillRepository: SkillRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.skillRepository = new SkillRepository();
  }

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const user = await this.userRepository.findById(userId);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(toProfileResponse(user));
    } catch (error) {
      console.error('Error in getProfile:', error);
      res.status(500).json({ message: 'Error fetching profile' });
    }
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { fullName, birthDate, keySkills, workExperience } = req.body;

      if (!fullName || typeof fullName !== 'string') {
        res.status(400).json({ message: 'fullName is required' });
        return;
      }

      const skills = await Promise.all(
        ((keySkills as string[]) ?? []).map((name) => this.skillRepository.findOrCreate({ name }))
      );

      const user = await this.userRepository.updateProfile(userId, {
        name: fullName,
        birthDate: birthDate ?? null,
        workExperience: workExperience ?? [],
        skills,
      });

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(toProfileResponse(user));
    } catch (error) {
      console.error('Error in updateProfile:', error);
      res.status(500).json({ message: 'Error updating profile' });
    }
  };
}
