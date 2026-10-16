import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

@ApiTags('AI Assistant (LiteLLM)')
@Controller('api/v1/ai')
@UseGuards(AuthGuard)
@Roles('ADMIN')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('parse-movie')
  @ApiOperation({ summary: 'Analyser un film via IA par son nom ou son URL de page' })
  async parseMovie(@Body('input') input: string) {
    if (!input || !input.trim()) {
      return { error: 'Veuillez fournir un nom ou une URL de film.' };
    }
    return this.aiService.parseMovie(input.trim());
  }

  @Post('parse-channel')
  @ApiOperation({ summary: 'Identifier une chaîne TV et générer logo et métadonnées via IA' })
  async parseChannel(@Body('input') input: string) {
    if (!input || !input.trim()) {
      return { error: 'Veuillez fournir un nom ou une URL de chaîne.' };
    }
    return this.aiService.parseChannel(input.trim());
  }
}
