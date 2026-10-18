import api from "../axios";
import {  FaqResp } from '@/types/faq'

export const faqApi = {
   getFAQ: () => api.get<FaqResp>("/faq"),
}