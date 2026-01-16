<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { MilkdownProvider } from '@milkdown/vue';
import Editor from './components/Editor.vue';
import { useNoteStore } from './stores/useNoteStore';

const store = useNoteStore();

onMounted(() => {
  store.bootstrap();
});

const notebooks = computed(() => store.notebooks);
const notes = computed(() => store.notes);
const activeNotebook = computed(() => store.activeNotebook);
const activeNote = computed(() => store.activeNote);

const handleSelectNotebook = (item: any) => {
  console.info('[ui] click notebook', item.path);
  store.selectNotebook(item);
};

const handleSelectNote = (item: any) => {
  console.info('[ui] click note', item.path);
  store.selectNote(item);
};
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">OneMDEditor</div>
      <!--<div class="actions">-->
      <!--  <button class="ghost" @click="store.createNotebook()">新建 Notebook</button>-->
      <!--  <button class="ghost" :disabled="!activeNotebook" @click="store.createNote()">新建笔记</button>-->
      <!--</div>-->
    </header>
    <main class="workspace">
      <aside class="panel notebooks">
        <div class="panel-title">
          <span>Notebooks</span>
          <button class="ghost" @click="store.createNotebook()" title="新建NoteBook">+</button>
        </div>
        <ul class="list">
          <li
            v-for="item in notebooks"
            :key="item.path"
            :class="{ active: activeNotebook?.path === item.path }"
            @click="handleSelectNotebook(item)"
          >
            {{ item.name }}
          </li>
        </ul>
      </aside>
      <section class="panel notes">
        <div class="panel-title">
          <span>Notes</span>
          <button class="ghost" :disabled="!activeNotebook" @click="store.createNote()" title="新建笔记">+</button>
        </div>
        <ul class="list">
          <li
            v-for="item in notes"
            :key="item.path"
            :class="{ active: activeNote?.path === item.path }"
            @click="handleSelectNote(item)"
          >
            {{ item.name }}
          </li>
        </ul>
      </section>
      <section class="panel editor">
        <MilkdownProvider v-if="activeNote" :key="activeNote.path">
          <Editor
            :key="activeNote.path"
            :model-value="store.currentContent"
            :note-title="activeNote.name"
            :note-path="activeNote.path"
            @update:modelValue="store.updateContent"
          />
        </MilkdownProvider>
        <div v-else class="empty-state">
          请选择笔记开始编辑
        </div>
      </section>
    </main>
  </div>
</template>
