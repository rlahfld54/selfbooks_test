const fs=require('fs');const tabs=['기본정보','확장정보','연결적요'];const d='frontend/app/features/accounts/components/AccountDetailPanel.vue';let s=fs.readFileSync(d,'utf8');
s=s.replace("const matrix = ref(false)","const matrix = ref(false)\nconst tab = defineModel<string>('tab', { default: '기본정보' })\nconst tabs = ['기본정보', '확장정보', '연결적요']");
s=s.replace("  'add-summary': []", "  'view-summaries': []\n  'add-summary': []");
s=s.replace('<aside class="am-detail', '<aside id="account-detail" class="am-detail');
s=s.replace('      <div class="am-detail-body">', `      <nav class="am-detail-nav" aria-label="계정 상세 정보">
        <button v-for="name in tabs" :key="name" type="button" :aria-pressed="tab === name" @click="tab = name">{{ name }}<span v-if="name === '연결적요'"> {{ linked.length }}</span></button>
      </nav>
      <div class="am-detail-body" :aria-label="tab">`);
s=s.replace('v-if="draft && !addingAccount"','v-if="draft && !addingAccount && tab !== \'연결적요\'"');
s=s.replace('<AccountFields v-model="draft" :accounts="accounts" />', '<AccountFields v-model="draft" :accounts="accounts" :section="tab === \'확장정보\' ? \'advanced\' : \'basic\'" />');
let idx=0;s=s.replaceAll('<section class="am-refined-info-section">',()=>`<section v-if="tab === '${tabs[idx++]}'" class="am-refined-info-section">`);
s=s.replace('<h3>연결된 적요 <span>{{ linked.length }}</span></h3>', '<h3>연결된 적요 <span>{{ linked.length }}</span></h3>\n              <UiButton size="small" @click="emit(\'view-summaries\')">전체보기</UiButton>');
fs.writeFileSync(d,s);
const f='frontend/app/features/accounts/components/AccountFields.vue';s=fs.readFileSync(f,'utf8').replace('accounts: MockAccount[] }','accounts: MockAccount[]; section?: \'basic\' | \'advanced\' }');
s=s.replace('<div class="am-fields">','<div class="am-fields">\n    <div v-show="section !== \'advanced\'" class="am-field-section">');
s=s.replace('    <label>\n      영문명','    </div>\n    <div v-show="section !== \'basic\'" class="am-field-section">\n    <label>\n      영문명');
const start=s.indexOf('    <label class="am-checkbox">\n      <input\n        type="checkbox"\n        :checked="modelValue.isActive"');
const end=s.indexOf('</label>',start)+8;const active=s.slice(start,end);s=s.slice(0,start)+s.slice(end);
s=s.replace('    </div>\n    <div v-show=',active+'\n    </div>\n    <div v-show=');
s=s.replace('  </div>\n</template>', '    </div>\n  </div>\n</template>');fs.writeFileSync(f,s);
