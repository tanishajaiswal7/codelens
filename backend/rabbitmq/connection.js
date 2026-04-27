import amqp from 'amqplib'

let connection = null
let channel = null

export async function connectRabbitMQ() {
  try {
    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost'
    connection = await amqp.connect(rabbitUrl)
    channel = await connection.createChannel()

    console.log('[RabbitMQ] Connected successfully')
  } catch (err) {
    console.error('[RabbitMQ] Connection failed:', err.message)
    throw err
  }
}

export function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.')
  }
  return channel
}

export async function closeConnection() {
  try {
    if (channel) {
      await channel.close()
    }
    if (connection) {
      await connection.close()
    }
    console.log('[RabbitMQ] Connection closed')
  } catch (err) {
    console.error('[RabbitMQ] Error closing connection:', err.message)
  }
}