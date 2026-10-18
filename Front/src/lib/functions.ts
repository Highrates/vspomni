export function formatCurrency(value: number | string): string {
  const num = Number(value)

  if (isNaN(num)) return String(value)

  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return ''
  
  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ]

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return ''
    }
    
    const day = date.getDate()
    const month = date.getMonth()
    const year = date.getFullYear()
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return ''
    }

    const monthName = months[month]
    if (!monthName) {
      return ''
    }

    return `${day} ${monthName} ${year}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}
export const decodeUnicode = (str: string) => {
  return str.replace(/\\u[\dA-F]{4}/gi, (match) => {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
  })
}

export const parseEditorJS = (jsonString: string) => {
  try {
    const decoded = decodeUnicode(jsonString)
    const parsed = JSON.parse(decoded)
    return parsed.blocks
      .map((block: any) => block.data?.text || '')
      .join('<br>')
  } catch (error) {
    console.error('Error parsing Editor.js content:', error)
    return ''
  }
}
