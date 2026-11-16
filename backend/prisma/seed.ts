import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.DEMO_OWNER_EMAIL ?? 'demo@nuanscape.studio'
  const demoPassword = process.env.DEMO_OWNER_PASSWORD ?? 'nuanscape-demo'
  const passwordHash = await hashPassword(demoPassword)
  const owner = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: 'Demo Owner',
      passwordHash,
      role: 'Owner',
      plan: 'Studio',
      preferences: { create: {} },
    },
    select: { id: true },
  })

  await prisma.userPreference.upsert({
    where: { userId: owner.id },
    update: {},
    create: { userId: owner.id },
  })

  await prisma.contentEnergy.upsert({
    where: { ownerId: owner.id },
    update: {},
    create: { ownerId: owner.id, current: 100, max: 100 },
  })

  await prisma.sellerSetting.upsert({
    where: { ownerId: owner.id },
    update: {},
    create: { ownerId: owner.id },
  })

  console.log(`Seed selesai: owner=${email} (tanpa data dummy)`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
