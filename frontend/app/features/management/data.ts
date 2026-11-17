export interface Staff { id: string; name: string; login: string; email: string; team: string; title: string; role: string; status: string; joined: string; phone?: string }
export interface Client { id: string; name: string; biz: string; type: string; ceo: string; primary: string; secondary: string[]; status: string; company: string; environment: string; chart: string; start: string; end: string; address: string }
export const roles=['조직 관리자','일반 사용자'];
export const staff: Staff[]=[
{id:'U001',name:'김원지',login:'wonji.kim',email:'wonji@aat-demo.example',team:'세무1팀',title:'세무사',role:'조직 관리자',status:'활성',joined:'2025-02-03',phone:'010-0000-1001'},
{id:'U002',name:'이수현',login:'suhyun.lee',email:'suhyun@aat-demo.example',team:'세무1팀',title:'팀장',role:'일반 사용자',status:'활성',joined:'2025-03-04'},
{id:'U003',name:'박민준',login:'minjun.park',email:'minjun@aat-demo.example',team:'세무1팀',title:'세무대리',role:'일반 사용자',status:'활성',joined:'2025-04-11'},
{id:'U004',name:'최지연',login:'jiyeon.choi',email:'jiyeon@aat-demo.example',team:'세무2팀',title:'팀장',role:'일반 사용자',status:'활성',joined:'2025-02-18'},
{id:'U005',name:'정하늘',login:'haneul.jung',email:'haneul@aat-demo.example',team:'세무2팀',title:'세무대리',role:'일반 사용자',status:'활성',joined:'2025-06-12'},
{id:'U006',name:'오세진',login:'sejin.oh',email:'sejin@aat-demo.example',team:'세무2팀',title:'사원',role:'일반 사용자',status:'활성',joined:'2025-08-07'},
{id:'U007',name:'한도윤',login:'doyun.han',email:'doyun@aat-demo.example',team:'관리팀',title:'매니저',role:'일반 사용자',status:'활성',joined:'2025-10-10'},
{id:'U008',name:'윤가은',login:'gaeun.yoon',email:'gaeun@aat-demo.example',team:'세무1팀',title:'사원',role:'일반 사용자',status:'초대 대기',joined:'2026-11-10'}];
export const clients: Client[]=[
{id:'C001',name:'한빛디자인',biz:'000-11-10001',type:'개인',ceo:'김하린',primary:'이수현',secondary:['박민준'],status:'수임 중',company:'검토 완료',environment:'검토 중',chart:'검토 전',start:'2025-01-01',end:'',address:'서울특별시 마포구 월드컵북로 00'},
{id:'C002',name:'주식회사 네오테크',biz:'000-22-10002',type:'법인',ceo:'정유진',primary:'최지연',secondary:['정하늘','오세진'],status:'수임 중',company:'검토 완료',environment:'검토 완료',chart:'검토 완료',start:'2024-04-01',end:'',address:'서울특별시 강남구 테헤란로 00'},
{id:'C003',name:'바른카페',biz:'000-33-10003',type:'개인',ceo:'이호준',primary:'박민준',secondary:[],status:'수임 중',company:'검토 전',environment:'검토 전',chart:'검토 전',start:'2026-02-15',end:'',address:'서울특별시 관악구 남부순환로 00'},
{id:'C004',name:'주식회사 더블유컴퍼니',biz:'000-44-10004',type:'법인',ceo:'박채원',primary:'김원지',secondary:['이수현'],status:'수임 중',company:'검토 완료',environment:'검토 완료',chart:'검토 중',start:'2024-06-01',end:'',address:'서울특별시 금천구 가산디지털로 00'},
{id:'C005',name:'모먼트스튜디오',biz:'000-55-10005',type:'개인',ceo:'오지훈',primary:'정하늘',secondary:['오세진'],status:'등록 대기',company:'검토 전',environment:'검토 전',chart:'검토 전',start:'2026-11-01',end:'',address:'서울특별시 성동구 연무장길 00'},
{id:'C006',name:'주식회사 루미너스',biz:'000-66-10006',type:'법인',ceo:'한서영',primary:'최지연',secondary:['정하늘'],status:'수임 중',company:'검토 중',environment:'검토 전',chart:'검토 전',start:'2025-09-12',end:'',address:'서울특별시 서초구 사임당로 00'},
{id:'C007',name:'따뜻한식탁',biz:'000-77-10007',type:'개인',ceo:'최태윤',primary:'이수현',secondary:['윤가은'],status:'수임 종료',company:'검토 완료',environment:'검토 완료',chart:'검토 완료',start:'2023-01-01',end:'2026-06-30',address:'서울특별시 동작구 상도로 00'},
{id:'C008',name:'주식회사 오션물류',biz:'000-88-10008',type:'법인',ceo:'서지민',primary:'박민준',secondary:['한도윤'],status:'수임 중',company:'검토 완료',environment:'검토 중',chart:'검토 전',start:'2026-03-01',end:'',address:'인천광역시 연수구 센트럴로 00'},
{id:'C009',name:'초록베이커리',biz:'000-99-10009',type:'개인',ceo:'배성우',primary:'정하늘',secondary:[],status:'수임 중',company:'검토 중',environment:'검토 중',chart:'검토 전',start:'2025-11-20',end:'',address:'서울특별시 영등포구 국회대로 00'},
{id:'C010',name:'주식회사 아크솔루션',biz:'000-10-10010',type:'법인',ceo:'문가영',primary:'김원지',secondary:['최지연'],status:'수임 종료',company:'검토 완료',environment:'검토 완료',chart:'검토 완료',start:'2022-05-01',end:'2026-07-31',address:'경기도 성남시 분당구 판교역로 00'}];

