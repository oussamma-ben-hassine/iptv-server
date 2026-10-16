import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl = (process.env.LITELLM_BASE_URL || 'https://ai.oussamma.tn/v1').replace(/\/$/, '');
  private readonly apiKey = process.env.LITELLM_API_KEY || 'sk-oussamma-master-gateway-2026';
  private readonly defaultModel = process.env.LITELLM_MODEL || 'gpt-4o-mini';
  private readonly fallbackModels = ['gpt-4o-mini', 'gpt-4o', 'chatgpt'];

  /**
   * Appelle LiteLLM avec un prompt système et un prompt utilisateur, et retourne un JSON pur
   */
  async generateJson(systemPrompt: string, userPrompt: string): Promise<any> {
    const modelsToTry = [this.defaultModel, ...this.fallbackModels.filter((m) => m !== this.defaultModel)];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' },
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 25000,
          },
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) continue;

        // Nettoyer d'éventuels backticks markdown
        const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        return JSON.parse(cleaned);
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Échec modèle LiteLLM ${model}: ${err.message}. Essai du modèle suivant...`);
      }
    }

    this.logger.error(`Tous les modèles LiteLLM ont échoué. Dernière erreur: ${lastError?.message}`);
    throw new Error(`Erreur du service IA LiteLLM: ${lastError?.response?.data?.error?.message || lastError?.message || 'Erreur inconnue'}`);
  }

  /**
   * Analyse une page Web ou un titre de film pour en extraire toutes les métadonnées de VOD
   */
  async parseMovie(input: string) {
    let contextHtml = '';
    const isUrl = input.trim().startsWith('http://') || input.trim().startsWith('https://');

    if (isUrl) {
      try {
        const pageRes = await axios.get(input.trim(), {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        // Extraire un extrait représentatif (titre, meta tags, liens vidéos)
        const rawHtml = String(pageRes.data);
        contextHtml = rawHtml.substring(0, 15000);
      } catch (e: any) {
        this.logger.warn(`Impossible de scraper l'URL du film directement: ${e.message}. Traitement par nom/URL.`);
      }
    }

    const systemPrompt = `Tu es un expert mondial en cinéma et métadonnées IPTV/VOD.
L'utilisateur te fournit soit le nom d'un film, soit l'URL d'une page de film (avec éventuellement du HTML).
Tu dois renvoyer UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "title": "Titre officiel du film en français ou original",
  "year": 2024,
  "genre": "Action" (choisi parmi Action, Aventure, Comédie, Drame, Science-Fiction, Horreur, Animation, Documentaire, Thriller),
  "rating": 8.2 (note estimée sur 10),
  "durationMin": 120,
  "director": "Nom du réalisateur",
  "plot": "Court synopsis accrocheur en français (2 à 3 phrases)",
  "posterUrl": "URL directe https vers une affiche officielle haute qualité du film (sur themoviedb.org ou image TMDB w500 valide si connue, sinon URL d'image trouvée)",
  "streamUrl": "URL directe du flux vidéo (.mp4, .mkv, .m3u8) si trouvée dans le texte/HTML, sinon chaîne vide \"\""
}`;

    const userPrompt = isUrl
      ? `Voici l'URL de la page du film : ${input}\nExtrait de contenu HTML/texte : \n${contextHtml}`
      : `Voici le nom du film à identifier : "${input}". Trouve les métadonnées officielles, le synopsis français, l'année exacte, le genre et une URL d'affiche TMDB valide.`;

    const result = await this.generateJson(systemPrompt, userPrompt);
    return result;
  }

  /**
   * Analyse une chaîne IPTV par son nom ou son URL de flux pour trouver logo, EPG, et catégorie
   */
  async parseChannel(input: string) {
    const isUrl = input.trim().startsWith('http://') || input.trim().startsWith('https://');

    const systemPrompt = `Tu es un expert des chaînes de télévision mondiales (France, Monde Arabe, USA, Europe, Afrique) et de l'EPG XMLTV.
L'utilisateur te fournit soit le nom d'une chaîne TV (ex: "TF1", "BeIN Sports 1", "El Watania 1", "M6", "Canal+"), soit une URL de flux.
Tu dois identifier la chaîne et renvoyer UNIQUEMENT un objet JSON avec cette structure :
{
  "name": "Nom officiel propre de la chaîne (ex: TF1 HD, BeIN Sports 1, El Watania 1)",
  "country": "Code pays ISO 2 lettres (ex: FR, TN, QA, SA, US)",
  "category": "Nom de la catégorie (ex: Sport, Général, Actualités, Cinéma, Musique, Enfants, Culture)",
  "epgId": "Identifiant XMLTV standard (ex: TF1.fr, Watania1.tn, beINSPORTS1.qa)",
  "logoUrl": "URL https directe vers un logo officiel vectoriel ou PNG transparent de haute qualité",
  "streamUrl": "${isUrl ? input.trim() : ''}"
}`;

    const userPrompt = `Identifie précisément cette chaîne TV : "${input}". Remplis les métadonnées, le bon code pays, la catégorie et un lien de logo officiel valide.`;

    const result = await this.generateJson(systemPrompt, userPrompt);
    return result;
  }
}
