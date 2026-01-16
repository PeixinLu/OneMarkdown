<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
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

const contextMenu = computed(() => menuState.value);
const menuState = ref({
  visible: false,
  x: 0,
  y: 0,
  type: '' as 'notebook' | 'note' | '',
  item: null as any,
});
const renameState = ref<{ type: 'notebook' | 'note'; path: string; name: string } | null>(null);
const renameInput = ref<HTMLInputElement | null>(null);

const handleSelectNotebook = (item: any) => {
  console.info('[ui] click notebook', item.path);
  store.selectNotebook(item);
};

const handleSelectNote = (item: any) => {
  console.info('[ui] click note', item.path);
  store.selectNote(item);
};

const openMenu = (event: MouseEvent, type: 'notebook' | 'note', item: any) => {
  event.preventDefault();
  menuState.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type,
    item,
  };
};

const closeMenu = () => {
  menuState.value = { visible: false, x: 0, y: 0, type: '', item: null };
};

const renameNotebook = () => {
  const item = menuState.value.item;
  if (!item) return;
  closeMenu();
  startRename('notebook', item);
};

const deleteNotebook = () => {
  const item = menuState.value.item;
  closeMenu();
  if (!item) return;
  store.deleteNotebook(item);
};

const renameNote = () => {
  const item = menuState.value.item;
  if (!item) return;
  closeMenu();
  startRename('note', item);
};

const deleteNote = () => {
  const item = menuState.value.item;
  closeMenu();
  if (!item) return;
  store.deleteNote(item);
};

onMounted(() => {
  window.addEventListener('click', closeMenu);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeMenu);
  window.removeEventListener('keydown', handleKeydown);
});

const startRename = (type: 'notebook' | 'note', item: any) => {
  renameState.value = { type, path: item.path, name: item.name };
  nextTick(() => {
    renameInput.value?.focus();
    renameInput.value?.select();
  });
};

const confirmRename = () => {
  const state = renameState.value;
  if (!state) return;
  const name = state.name.trim();
  renameState.value = null;
  if (!name) return;
  if (state.type === 'notebook') {
    const nb = store.notebooks.find((n) => n.path === state.path);
    if (nb) store.renameNotebook(nb, name);
  } else {
    const note = store.notes.find((n) => n.path === state.path);
    if (note) store.renameNote(note, name);
  }
};

const cancelRename = () => {
  renameState.value = null;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'F2') {
    event.preventDefault();
    if (activeNote.value) {
      startRename('note', activeNote.value);
    } else if (activeNotebook.value) {
      startRename('notebook', activeNotebook.value);
    }
  }
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
            @contextmenu="openMenu($event, 'notebook', item)"
            @dblclick.stop="startRename('notebook', item)"
          >
            <span v-if="renameState?.path === item.path && renameState?.type === 'notebook'">
              <input
                ref="renameInput"
                v-model="renameState.name"
                class="rename-input"
                @keydown.enter.stop.prevent="confirmRename"
                @keydown.esc.stop.prevent="cancelRename"
                @blur="confirmRename"
              />
            </span>
            <span v-else>
              {{ item.name }}
            </span>
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
            @contextmenu="openMenu($event, 'note', item)"
            @dblclick.stop="startRename('note', item)"
          >
            <span v-if="renameState?.path === item.path && renameState?.type === 'note'">
              <input
                ref="renameInput"
                v-model="renameState.name"
                class="rename-input"
                @keydown.enter.stop.prevent="confirmRename"
                @keydown.esc.stop.prevent="cancelRename"
                @blur="confirmRename"
              />
            </span>
            <span v-else>
              {{ item.name }}
            </span>
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
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
      @click.stop
    >
      <template v-if="contextMenu.type === 'notebook'">
        <div class="menu-item" @click="renameNotebook">重命名 Notebook</div>
        <div class="menu-item danger" @click="deleteNotebook">删除 Notebook</div>
      </template>
      <template v-else-if="contextMenu.type === 'note'">
        <div class="menu-item" @click="renameNote">重命名笔记</div>
        <div class="menu-item danger" @click="deleteNote">删除笔记</div>
      </template>
    </div>
  </div>
</template>
