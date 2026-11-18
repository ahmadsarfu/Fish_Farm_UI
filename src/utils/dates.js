import { businessDate } from '../businessDate'

export const getLocalDate = businessDate
export const getLocalMonth = (date = new Date()) => businessDate(date).slice(0, 7)
