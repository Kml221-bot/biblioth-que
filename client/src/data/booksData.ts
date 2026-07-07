export interface BookCategory {
  id: string;
  label: string;
  emoji: string;
  query: string;
}

export const bookCategories: BookCategory[] = [
  {
    id: 'informatique-cybersecurite',
    label: 'Informatique & Cybersécurité',
    emoji: '💻',
    query: 'informatique cybersécurité programmation réseaux',
  },
  {
    id: 'developpement-personnel',
    label: 'Développement Personnel',
    emoji: '🌱',
    query: 'développement personnel productivité motivation',
  },
  {
    id: 'litterature-africaine-senegalaise',
    label: 'Littérature Africaine & Sénégalaise',
    emoji: '🌍',
    query: 'littérature africaine sénégalaise roman afrique',
  },
  {
    id: 'economie-business',
    label: 'Économie & Business',
    emoji: '💼',
    query: 'économie business entrepreneuriat finance',
  },
  {
    id: 'dark-romance',
    label: 'Dark Romance',
    emoji: '🌙',
    query: 'dark romance roman romance',
  },
  {
    id: 'roman',
    label: 'Roman',
    emoji: '📖',
    query: 'roman fiction littérature classique',
  },
  {
    id: 'manga-bd',
    label: 'Manga & BD',
    emoji: '📚',
    query: 'manga bande dessinée comics',
  },
  {
    id: 'droit-sciences-politiques',
    label: 'Droit & Sciences Politiques',
    emoji: '⚖️',
    query: 'droit sciences politiques juridique',
  },
];
