import { AssistantStream } from 'openai/lib/AssistantStream'
import { Message } from 'openai/resources/beta/threads/messages'
import { Run } from 'openai/resources/beta/threads/runs/runs'
import { Thread } from 'openai/resources/beta/threads/threads'
import { prisma } from '@/lib/prisma'
// TODO: Создать модули account и client
// import { getCachedAiAccount } from '../account'
// import { getAiClient } from '../client'
// import { AiCampaign } from '../types'

// Временные заглушки
const getCachedAiAccount = async () => ({
  key: 'dummy-key',
  promoAssistantId: 'dummy-assistant-id'
})
const getAiClient = (key: string) => null as any
type AiCampaign = any

export class CampaignAssistant {
  private constructor(
    private readonly accountKey: string,
    private readonly assistantId: string,
    private readonly threadId: string | null,
    private readonly campaignId: number
  ) {}

  static async init(campaignId: number) {
    const aiAccount = await getCachedAiAccount()
    if (!aiAccount) throw new Error('AI account not found')

    // TODO: Добавить модель Campaign в Prisma schema
    // const campaign = await prisma.campaign.findUnique({
    //   where: { id: campaignId },
    //   select: { aiThreadId: true }
    // })
    // if (!campaign) throw new Error('Campaign not found')

    return new CampaignAssistant(
      aiAccount.key,
      aiAccount.promoAssistantId,
      null, // campaign.aiThreadId
      campaignId
    )
  }

  async createThread(): Promise<string> {
    const openai = getAiClient(this.accountKey)
    const thread: Thread = await openai.beta.threads.create()
    
    // TODO: Добавить модель Campaign в Prisma schema
    // await prisma.campaign.update({
    //   where: { id: this.campaignId },
    //   data: { aiThreadId: thread.id }
    // })
    
    // this.threadId = thread.id // Cannot assign to read-only property
    return thread.id
  }

  async *createRun(content: string): AsyncGenerator<string, string> {
    const openai = getAiClient(this.accountKey)

    let threadId = this.threadId
    if (!threadId) {
      threadId = await this.createThread()
    }

    // Add message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content
    })

    // Create and stream run
    const stream = AssistantStream.fromReadableStream(
      await openai.beta.threads.runs.stream(threadId, {
        assistant_id: this.assistantId
      })
    )

    let fullResponse = ''
    for await (const chunk of stream) {
      if (chunk.event === 'thread.message.delta') {
        const content = chunk.data.delta?.content?.[0]
        if (content && 'text' in content) {
          const text = content.text
          if (text?.value) {
            fullResponse += text.value
            yield text.value
          }
        }
      }
    }

    return fullResponse
  }

  async retrieveRun(threadId: string, runId: string): Promise<Run> {
    const openai = getAiClient(this.accountKey)
    // Fix: Pass correct parameters to runs.retrieve
    return await openai.beta.threads.runs.retrieve(threadId, {
      run_id: runId
    })
  }

  async getMessages(threadId: string): Promise<Message[]> {
    const openai = getAiClient(this.accountKey)
    // Fix: Pass correct parameters to messages.list
    const response = await openai.beta.threads.messages.list(threadId, {
      order: 'asc'
    })
    return response.data
  }

  async processCampaign(campaignData: AiCampaign) {
    const jsonContent = JSON.stringify(campaignData, null, 2)
    
    const prompt = `
      Process this campaign data and provide optimization suggestions:
      
      ${jsonContent}

      Please analyze the campaign performance and suggest improvements.
    `

    let threadId = this.threadId
    if (!threadId) {
      threadId = await this.createThread()
    }

    const openai = getAiClient(this.accountKey)
    
    // Add message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: prompt
    })

    // Create run
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: this.assistantId
    })

    // Wait for run completion
    let runStatus = await this.retrieveRun(threadId, run.id)
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await this.retrieveRun(threadId, run.id)
    }

    if (runStatus.status === 'failed') {
      throw new Error(`Run failed: ${runStatus.last_error?.message}`)
    }

    // Get messages
    const messages = await this.getMessages(threadId)
    const assistantMessage = messages.find(m => m.role === 'assistant')
    
    if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
      throw new Error('No valid assistant response')
    }

    return assistantMessage.content[0].text.value
  }
}