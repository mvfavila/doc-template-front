interface PlaceholderConfig {
    type: string;
    required: boolean;
    alias: string;
}

interface Placeholders {
[key: string]: PlaceholderConfig;
}