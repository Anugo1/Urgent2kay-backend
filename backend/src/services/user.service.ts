import { prisma } from '../lib/prisma';

export const getAllBenefactors = async () => {
return prisma.user.findMany({
where: {
role: 'BENEFACTOR',
},
select: {
id: true,
name: true,
email: true,
phone: true,
createdAt: true,
updatedAt: true,
// Add any other fields you'd like to expose
},
});
};