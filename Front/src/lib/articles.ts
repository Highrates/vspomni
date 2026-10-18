// Утилиты для работы со статьями

export function formatArticleDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function parseContent(content: any) {
  if (!content) return null;
  
  if (typeof content === 'string') {
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    }
  }
  
  return content;
}

export function extractArticleText(content: any, maxLength = 300): string {
  const parsed = parseContent(content);
  if (!parsed) return '';
  
  if (parsed?.blocks?.length) {
    const text = parsed.blocks
      .map((b: any) => {
        if (b.type === 'paragraph' || b.type === 'header') return b.data?.text || '';
        if (b.type === 'list') return b.data?.items?.join(' ') || '';
        return '';
      })
      .join(' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  return String(parsed).replace(/<[^>]*>/g, '').trim();
}

export function parseArticleContent(content: any) {
  return parseContent(content);
}

