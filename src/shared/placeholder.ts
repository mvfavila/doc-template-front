interface PlaceholderConfig {
    alias: string;
    type: 'short_text' | 'long_text' | 'name' | 'cpf' | 'cnpj' | 'email' | 'phone';
    required: boolean;
  }

interface Placeholders {
    [key: string]: PlaceholderConfig;
}