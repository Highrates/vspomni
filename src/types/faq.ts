export interface FaqItem {
    id: number | string
    title: string
    shortText: string
    answer: string
}

export interface FaqResp {

  faqs: FaqItem[]
}