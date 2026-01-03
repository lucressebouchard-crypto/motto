/**
 * Script de test pour vérifier le système de badges de messages
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function loadEnv() {
  const envPath = join(rootDir, '.env.local');
  if (!existsSync(envPath)) {
    throw new Error('Fichier .env.local non trouvé');
  }
  const content = readFileSync(envPath, 'utf-8');
  const vars = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length) {
        vars[key.trim()] = values.join('=').trim();
      }
    }
  });
  return vars;
}

async function testMessageReads() {
  console.log('🔍 Test du système de badges de messages\n');
  
  const env = loadEnv();
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  
  // 1. Vérifier si la table message_reads existe
  console.log('1️⃣ Vérification de la table message_reads...');
  try {
    const { data, error } = await supabase
      .from('message_reads')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('❌ La table message_reads n\'existe pas encore !');
        console.log('💡 Exécutez: npm run supabase:init\n');
        return;
      }
      throw error;
    }
    console.log('✅ Table message_reads existe\n');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }
  
  // 2. Vérifier les messages et leur statut de lecture
  console.log('2️⃣ Vérification des messages...');
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, text')
    .limit(5);
  
  if (messagesError) {
    console.error('❌ Erreur:', messagesError.message);
    return;
  }
  
  if (!messages || messages.length === 0) {
    console.log('ℹ️ Aucun message trouvé\n');
    return;
  }
  
  console.log(`✅ ${messages.length} messages trouvés\n`);
  
  // 3. Vérifier les entrées dans message_reads
  console.log('3️⃣ Vérification des messages lus...');
  const { data: readMessages, error: readError } = await supabase
    .from('message_reads')
    .select('*')
    .limit(5);
  
  if (readError) {
    console.error('❌ Erreur:', readError.message);
    return;
  }
  
  console.log(`✅ ${readMessages?.length || 0} entrées dans message_reads\n`);
  
  // 4. Tester le comptage
  if (messages.length > 0) {
    const chatId = messages[0].chat_id;
    console.log(`4️⃣ Test du comptage pour le chat ${chatId}...`);
    
    // Compter tous les messages du chat
    const { data: allMessages, error: allError } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId);
    
    if (!allError && allMessages) {
      console.log(`   Total messages: ${allMessages.length}`);
      
      // Compter les messages lus
      const messageIds = allMessages.map(m => m.id);
      const { data: read, error: readErr } = await supabase
        .from('message_reads')
        .select('message_id')
        .in('message_id', messageIds);
      
      if (!readErr && read) {
        console.log(`   Messages lus: ${read.length}`);
        console.log(`   Messages non lus: ${allMessages.length - read.length}`);
      }
    }
  }
  
  console.log('\n✅ Test terminé\n');
}

testMessageReads().catch(console.error);

