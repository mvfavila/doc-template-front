export const validateField = (value: string, config: PlaceholderConfig): string | null => {
    if (config.required && !value) return "Campo obrigatório";
    
    switch(config.type) {
      case 'name':
        if (!/^[a-zA-ZÀ-ú ]+$/.test(value)) return "Somente letras são permitidas";
        if (value.length > 100) return "Máximo de 100 caracteres";
        break;
      case 'short_text':
        if (value.length > 100) return "Máximo de 100 caracteres";
        break;
      case 'long_text':
        if (value.length > 1000) return "Máximo de 1000 caracteres";
        break;
      case 'cpf':
        if (!/^[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}\-?[0-9]{2}$/.test(value)) return "CPF inválido";
        break;
      case 'cnpj':
        if (!/^[0-9]{2}\.?[0-9]{3}\.?[0-9]{3}\/?[0-9]{4}\-?[0-9]{2}$/.test(value)) return "CNPJ inválido";
        break;
      case 'email':
        if (!/^[^@]+@[^@]+\.[^@]+$/.test(value)) return "E-mail inválido";
        break;
      case 'phone':
        if (!/^(\+?[0-9]{2})?[0-9]{4,5}[0-9]{4}$/.test(value)) return "Telefone inválido";
        break;
    }
    
    return null;
  };