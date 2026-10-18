import {Product} from '@/types/product' 

export const mockProductsGrid: Product[] = [
    {
        id: 1,
        title: 'Чистый хлопок',
        overview:
        'Аромат спокойствия, который наполняет дом чувственностью и теплом',
        price: { id: 1, price: 12890, isDiscont: false },
        img: { 
            id: 1, 
            main: '/images/product1.png' ,
            gallery: ['/images/productGallery.jpg', '/images/productGallery2.jpg', '/images/productGallery3.jpg']
        },
        groups: [
        { id: 1, group: 'flower', title: 'Cладкий 🤤' },
        { id: 2, group: 'wood', title: 'Цветочный 🌸' },
        { id: 3, group: 'sweet', title: 'Древесный \uD83E\uDEB5' },
        ],
        size: '100 мл',
        capacity: ['50', '100', 'sampler'],
    },
    {
        id: 2,
        title: 'Кашемир и слива',
        overview:
        'Аромат спокойствия, который наполняет дом чувственностью и теплом',
        price: { id: 2, price: 12890, isDiscont: false },
        img: { 
            id: 1,
            main: '/images/product2.png', 
            gallery: ['/images/productGallery.jpg', '/images/productGallery2.jpg', '/images/productGallery3.jpg'],},
        groups: [
        { id: 1, group: 'flower', title: 'Cладкий 🤤' },
        { id: 2, group: 'wood', title: 'Цветочный 🌸' },
        { id: 3, group: 'sweet', title: 'Древесный \uD83E\uDEB5' },
        ],
        size: '100 мл',
        capacity: ['50', '100', 'sampler'],
    },
     {
        id: 3,
        title: 'Дубайский шоколад',
        overview:
        'Аромат спокойствия, который наполняет дом чувственностью и теплом',
        price: { id: 1, price: 12890, isDiscont: false },
        img: { 
            id: 3,
            main: '/images/product3.png',
            gallery: ['/images/productGallery.jpg', '/images/productGallery2.jpg', '/images/productGallery3.jpg'] },
        groups: [
        { id: 1, group: 'flower', title: 'Cладкий 🤤' },
        { id: 2, group: 'wood', title: 'Цветочный 🌸' },
        { id: 3, group: 'sweet', title: 'Древесный \uD83E\uDEB5' },
        ],
        size: '100 мл',
        capacity: ['50', '100', 'sampler'],
    },
    {
        id: 4,
        title: 'Кашемир и слива',
        overview:
        'Аромат спокойствия, который наполняет дом чувственностью и теплом',
        price: { id: 1, price: 12890, isDiscont: false },
        img: { 
            id: 2, 
            main: '/images/productGallery2.jpg',
            gallery: ['/images/productGallery.jpg', '/images/productGallery2.jpg', '/images/productGallery3.jpg']
         },
        groups: [
        { id: 1, group: 'flower', title: 'Cладкий 🤤' },
        { id: 2, group: 'wood', title: 'Цветочный 🌸' },
        { id: 3, group: 'sweet', title: 'Древесный \uD83E\uDEB5' },
        ],
        size: '100 мл',
        capacity: ['50', '100', 'sampler'],
    },








]