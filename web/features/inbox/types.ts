export type NotificationType =
  | 'mention'
  | 'parecer_reply'
  | 'comment_reply'
  | 'ass_app'
  | 'fichas_atrasadas'
  | string;

export type InboxItem = {
  id: string;
  user_id: string;
  type: NotificationType;
  priority?: 'low' | 'high' | null;
  author_name?: string | null;
  primary_name?: string | null;
  content?: string | null;
  title?: string | null;
  body?: string | null;
  meta?: any;
  card_id?: string | null;
  comment_id?: string | null;
  link_url?: string | null;
  expires_at?: string | null;
  read_at?: string | null;
  created_at?: string | null;
  applicant_id?: string | null;
};

// Filtro padronizado para a Inbox (compartilhado entre componentes)
export type InboxFilterOption = "mentions" | "parecer" | "comentarios";
