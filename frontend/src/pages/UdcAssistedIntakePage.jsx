import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import { useRole } from '../hooks/useRole';
import offlineDb from '../services/offlineDb';
import syncEngine from '../services/syncEngine';
import api from '../services/api';

export default function UdcAssistedIntakePage({ onNavigateToCase }) {
  const { language, t } = useLanguage();
  const { activeRole } = useRole();

  // Connectivity state: real browser status + simulation toggle for testing
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);

  const isEffectivelyOnline = isBrowserOnline && !isSimulatedOffline;

  // Form State for Assisted Intake
  const [applicant, setApplicant] = useState({
    full_name: '',
    full_name_bn: '',
    phone: '',
    upazila: 'Baghaichhari',
    district: 'Rangamati',
    division: 'Chittagong'
  });

  const [category, setCategory] = useState('INDIGENOUS_RIGHTS');
  const [stage1Marma, setStage1Marma] = useState('');
  const [stage2Bangla, setStage2Bangla] = useState('');
  const [stage3Typed, setStage3Typed] = useState('');

  // AI Pre-assessment (Stage 4)
  const [aiResult, setAiResult] = useState(null);
  const [runningAi, setRunningAi] = useState(false);

  // Queue and Sync state
  const [queue, setQueue] = useState([]);
  const [queueStats, setQueueStats] = useState({ pending: 0, synced: 0, conflict: 0, failed: 0, total: 0 });
  const [syncing, setSyncing] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  // Conflict Resolution State
  const [activeConflictItem, setActiveConflictItem] = useState(null);
  const [conflictResolutionStrategy, setConflictResolutionStrategy] = useState('MERGE');
  const [mergedForm, setMergedForm] = useState({ phone: '', district: '', summary: '' });

  // Listen to browser network changes
  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refresh queue on mount
  const refreshQueue = async () => {
    try {
      const items = await offlineDb.getAllQueue();
      const stats = await offlineDb.getQueueStats();
      setQueue(items);
      setQueueStats(stats);
    } catch (e) {
      console.error('Failed to load IndexedDB queue:', e);
    }
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  // Pre-fill Nuching Marma Scenario
  const handleLoadNuchingScenario = () => {
    setApplicant({
      full_name: 'Nuching Marma',
      full_name_bn: 'নুচিং মারমা',
      phone: '01899000142',
      upazila: 'Baghaichhari',
      district: 'Rangamati',
      division: 'Chittagong'
    });
    setCategory('INDIGENOUS_RIGHTS');
    setStage1Marma(
      'အဘိုးအဘွားလက်ထက်ကတည်းက စိုက်ပျိုးလုပ်ကိုင်လာတဲ့ တောင်ယာမြေကို ဓားပြတိုက်လုယူဖို့ ကြိုးစားနေပါတယ်။ (Marma-language sample / UDC-recorded source: Ancestral hill agricultural plot cultivated across three generations under threat of unlawful dispossession by outside encroachers).'
    );
    setStage2Bangla(
      'আমাদের তিন পুরুষ ধরে চাষাবাদ করা ঐতিহ্যগত জুম ও পাহাড়ি জমি থেকে অন্যায়ভাবে উচ্ছেদের অপচেষ্টা চলছে। আমাদের কাছে স্থানীয় হেডম্যানের মৌজা রেকর্ড রয়েছে।'
    );
    setStage3Typed(
      'আবেদনকারী নুচিং মারমা বাঘাইছড়ি উপজেলার বাসিন্দা। নিরক্ষর বিধায় মৌখিক বর্ণনা অনুযায়ী ইউডিসি উদ্যোক্তা কর্তৃক টার্মিনালে তথ্য লিপিবদ্ধ করা হলো। ঐতিহ্যগত পাহাড়ি জমির সুরক্ষা ও আইনি সহায়তা প্রার্থনা।'
    );
    setFeedbackNotice({
      type: 'info',
      message: language === 'bn' ? 'নুচিং মারমার তথ্য সফলভাবে লোড করা হয়েছে।' : 'Nuching Marma CHT scenario loaded successfully.'
    });
  };

  // Run AI Pre-assessment (Stage 4)
  const handleRunAi = async () => {
    setRunningAi(true);
    try {
      if (isEffectivelyOnline) {
        const res = await api.aiPreAssess({
          summary: stage2Bangla || stage3Typed || stage1Marma,
          language: 'marma'
        });
        setAiResult(res.data);
      } else {
        // Deterministic offline rule fallback
        setAiResult({
          suggested_category: 'INDIGENOUS_RIGHTS',
          risk_level: 'HIGH',
          suggested_jurisdiction: 'Joint District Judge Court & Mouza Headman Customary Bench (CHT Regulation 1900)',
          document_checklist: [
            'Mouza Headman Customary Land Possession Certificate',
            'Land Revenue Dakhila / Upazila Land Office Record',
            'Traditional Boundary Sketch Signed by Karbari'
          ],
          confidence_score: 0.92,
          model_identifier: 'ADLASB-RulesEngine-Offline-v1',
          disclaimer: 'AI-assisted suggestion — human confirmation required (Offline Pre-assessment)'
        });
      }
    } catch (err) {
      console.warn('AI pre-assessment fallback:', err);
    } finally {
      setRunningAi(false);
    }
  };

  // Save to IndexedDB (Offline Queue)
  const handleSaveOffline = async () => {
    if (!applicant.full_name || !stage1Marma) {
      setFeedbackNotice({
        type: 'error',
        message: language === 'bn' ? 'আবেদনকারীর নাম এবং মূল মৌখিক বক্তব্য আবশ্যক।' : 'Applicant name and original oral statement are required.'
      });
      return;
    }

    try {
      const payload = {
        applicant: {
          full_name: applicant.full_name,
          full_name_bn: applicant.full_name_bn || null,
          phone: applicant.phone || null,
          upazila: applicant.upazila,
          district: applicant.district,
          division: applicant.division,
          socio_economic_profile: {
            ethnicity: 'Marma',
            literacy_level: 'LOW_ORAL',
            intake_mode: 'UDC_ASSISTED'
          }
        },
        category,
        intake_channel: 'UDC_OFFLINE_TERMINAL',
        intake_office: `DLAO ${applicant.district}`,
        summary: stage2Bangla || stage3Typed,
        summary_bn: stage2Bangla,
        provenance: [
          {
            field_name: 'oral_statement',
            source_type: 'spoken_by_person',
            source_language: 'marma',
            target_language: 'marma',
            raw_content: stage1Marma,
            processed_content: stage1Marma,
            author_role: 'CITIZEN_APPLICANT'
          },
          {
            field_name: 'translated_statement',
            source_type: 'translated',
            source_language: 'marma',
            target_language: 'bn',
            raw_content: stage2Bangla,
            processed_content: stage2Bangla,
            author_role: 'B4_UDC_ENTREPRENEUR'
          },
          {
            field_name: 'intake_text_entry',
            source_type: 'typed_by_staff',
            source_language: 'bn',
            target_language: 'bn',
            raw_content: stage3Typed,
            processed_content: stage3Typed,
            author_role: 'B4_UDC_ENTREPRENEUR'
          }
        ]
      };

      if (aiResult) {
        payload.provenance.push({
          field_name: 'legal_category_recommendation',
          source_type: 'ai_assisted',
          source_language: 'bn',
          target_language: 'en',
          raw_content: JSON.stringify(aiResult),
          processed_content: aiResult.disclaimer,
          author_role: 'SYSTEM'
        });
      }

      const enqueued = await offlineDb.enqueueApplication(payload, {
        id: 'PER-UDC-B4',
        role: 'B4_UDC_ENTREPRENEUR',
        office: `${applicant.upazila} UDC`
      });

      await refreshQueue();

      setFeedbackNotice({
        type: 'success',
        message: language === 'bn' 
          ? `অফলাইনে সফলভাবে সংরক্ষিত হয়েছে! অস্থায়ী আইডি: ${enqueued.local_id}`
          : `Saved locally on this device! Temporary ID: ${enqueued.local_id} — Waiting for network connection.`
      });

      // Clear narrative fields
      setStage1Marma('');
      setStage2Bangla('');
      setStage3Typed('');
      setAiResult(null);
    } catch (e) {
      setFeedbackNotice({
        type: 'error',
        message: `Failed to save offline: ${e.message}`
      });
    }
  };

  // Trigger Sync with Backend
  const handleSyncNow = async () => {
    if (!isEffectivelyOnline) {
      setFeedbackNotice({
        type: 'error',
        message: language === 'bn' ? 'ডিভাইস বর্তমানে অফলাইনে রয়েছে। সংযোগ চালু করে সিঙ্ক করুন।' : 'Device is offline. Enable network connection before syncing.'
      });
      return;
    }

    setSyncing(true);
    setFeedbackNotice(null);

    try {
      const summary = await syncEngine.syncAllPending();
      await refreshQueue();

      if (summary.conflicts > 0) {
        setFeedbackNotice({
          type: 'warning',
          message: language === 'bn'
            ? `সিঙ্ক সমাপ্ত: ${summary.synced} টি সিঙ্কড, ${summary.conflicts} টিতে সংঘর্ষ শনাক্ত হয়েছে! অনুগ্রহ করে নিচে পর্যালোচনা করুন।`
            : `Sync completed: ${summary.synced} synced, ${summary.conflicts} conflicts detected! Please inspect below.`
        });
      } else {
        setFeedbackNotice({
          type: 'success',
          message: language === 'bn'
            ? `সিঙ্ক সফল! ${summary.synced} টি আবেদন কেন্দ্রীয় ডিএলএও সার্ভারে সংরক্ষিত হয়েছে।`
            : `Sync successful! ${summary.synced} applications registered with central DLAO backend.`
        });
      }
    } catch (e) {
      setFeedbackNotice({
        type: 'error',
        message: `Sync failed: ${e.message}`
      });
    } finally {
      setSyncing(false);
    }
  };

  // Open Conflict Resolver Modal
  const handleOpenConflict = (item) => {
    setActiveConflictItem(item);
    const serverVer = item.conflict_data?.server_version || {};
    const localVer = item.conflict_data?.local_version || {};
    setMergedForm({
      phone: localVer.phone || serverVer.applicant_phone || '',
      district: serverVer.applicant_district || localVer.district || '',
      summary: localVer.summary || serverVer.summary || ''
    });
  };

  // Resolve Active Conflict
  const handleResolveConflict = async () => {
    if (!activeConflictItem) return;

    try {
      await syncEngine.resolveConflict(
        activeConflictItem.local_id,
        conflictResolutionStrategy,
        mergedForm
      );

      await refreshQueue();
      setActiveConflictItem(null);

      setFeedbackNotice({
        type: 'success',
        message: language === 'bn'
          ? 'সংঘর্ষ সফলভাবে সমাধান করা হয়েছে এবং অডিট লগে লিপিবদ্ধ হয়েছে!'
          : 'Conflict successfully resolved and recorded in audit log!'
      });
    } catch (e) {
      setFeedbackNotice({
        type: 'error',
        message: `Failed to resolve conflict: ${e.message}`
      });
    }
  };

  return (
    <div className="citizen-portal-container" role="main" aria-label="UDC Assisted Intake Portal">
      {/* Connectivity & Low-Bandwidth Status Banner */}
      <div className={`udc-connectivity-banner ${isEffectivelyOnline ? 'online' : 'offline'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{isEffectivelyOnline ? '🟢' : '🟠'}</span>
          <div>
            <strong>
              {isEffectivelyOnline ? t('udc.onlineNotice') : t('udc.offlineNotice')}
            </strong>
            <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
              Terminal Mode: <strong>{isEffectivelyOnline ? 'Online (Connected)' : 'Offline Storage (IndexedDB Active)'}</strong> • {t('udc.lowBandwidth')}
            </div>
          </div>
        </div>

        {/* Network Simulation Toggle for testing */}
        <button
          type="button"
          className="btn-sim-offline"
          onClick={() => setIsSimulatedOffline(!isSimulatedOffline)}
          aria-label={isSimulatedOffline ? t('udc.simOnline') : t('udc.simOffline')}
        >
          {isSimulatedOffline ? `🌐 ${t('udc.simOnline')}` : `🔌 ${t('udc.simOffline')}`}
        </button>
      </div>

      {/* Hero Header */}
      <div className="rep-header-card" style={{ borderLeftColor: '#0F766E', borderLeftWidth: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div className="rep-avatar" style={{ backgroundColor: '#CCFBF1' }} aria-hidden="true">🌾</div>
          <div>
            <div className="rep-role-tag" style={{ backgroundColor: '#0F766E' }}>
              UDC Entrepreneur Assisted Portal • Baghaichhari
            </div>
            <h2 className="rep-name">{t('udc.title')}</h2>
            <p className="rep-representing-text" style={{ color: '#475569' }}>
              {t('udc.subtitle')}
            </p>
          </div>
        </div>

        {/* 1-Click Nuching Demo Scenario Button */}
        <button
          type="button"
          className="btn-citizen-cta"
          onClick={handleLoadNuchingScenario}
          title="Pre-populate Nuching Marma CHT scenario"
        >
          {t('udc.loadNuchingScenario')}
        </button>
      </div>

      {/* Feedback Alert */}
      {feedbackNotice && (
        <div className={`citizen-alert-box ${feedbackNotice.type === 'error' ? 'error' : ''}`} style={{
          backgroundColor: feedbackNotice.type === 'error' ? '#FEF2F2' : (feedbackNotice.type === 'warning' ? '#FFFBEB' : '#F0FDF4'),
          borderColor: feedbackNotice.type === 'error' ? '#FECACA' : (feedbackNotice.type === 'warning' ? '#FDE68A' : '#86EFAC'),
          color: feedbackNotice.type === 'error' ? '#991B1B' : (feedbackNotice.type === 'warning' ? '#92400E' : '#166534')
        }} role="alert">
          <span>{feedbackNotice.type === 'error' ? '⚠️' : (feedbackNotice.type === 'warning' ? '⚡' : '✅')}</span>
          <div>{feedbackNotice.message}</div>
        </div>
      )}

      {/* Applicant & Context Profile Grid */}
      <div className="citizen-status-card">
        <h3 className="card-title">👤 {t('udc.applicantContext')}</h3>
        <div className="citizen-facts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="citizen-fact-cell">
            <span className="fact-label">{language === 'bn' ? 'আবেদনকারী' : 'Applicant'}:</span>
            <span className="fact-value highlight">{applicant.full_name || 'Nuching Marma'}</span>
          </div>
          <div className="citizen-fact-cell">
            <span className="fact-label">{language === 'bn' ? 'ভাষা / উপভাষা' : 'Language'}:</span>
            <span className="fact-value">{t('udc.language')}</span>
          </div>
          <div className="citizen-fact-cell">
            <span className="fact-label">{language === 'bn' ? 'সাক্ষরতার স্তর' : 'Literacy'}:</span>
            <span className="fact-value">{t('udc.literacy')}</span>
          </div>
          <div className="citizen-fact-cell">
            <span className="fact-label">{language === 'bn' ? 'সংযোগের অবস্থা' : 'Connectivity'}:</span>
            <span className="fact-value">{t('udc.connectivity')}</span>
          </div>
        </div>

        {/* Input Details Grid */}
        <div className="form-grid-2col" style={{ marginTop: '16px' }}>
          <div className="form-group">
            <label className="form-label">{language === 'bn' ? 'আবেদনকারীর পুরো নাম (ইংরেজি)' : 'Full Name (English)'} *</label>
            <input
              type="text"
              className="form-input"
              value={applicant.full_name}
              onChange={(e) => setApplicant({ ...applicant, full_name: e.target.value })}
              placeholder="e.g. Nuching Marma"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{language === 'bn' ? 'আবেদনকারীর নাম (বাংলায়)' : 'Full Name (Bangla)'}</label>
            <input
              type="text"
              className="form-input"
              value={applicant.full_name_bn}
              onChange={(e) => setApplicant({ ...applicant, full_name_bn: e.target.value })}
              placeholder="যেমন: নুচিং মারমা"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{language === 'bn' ? 'যোগাযোগের ফোন নম্বর' : 'Phone Number'}</label>
            <input
              type="text"
              className="form-input"
              value={applicant.phone}
              onChange={(e) => setApplicant({ ...applicant, phone: e.target.value })}
              placeholder="018..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">{language === 'bn' ? 'উপজেলা ও জেলা' : 'Upazila & District'}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                value={applicant.upazila}
                onChange={(e) => setApplicant({ ...applicant, upazila: e.target.value })}
                placeholder="Baghaichhari"
              />
              <input
                type="text"
                className="form-input"
                value={applicant.district}
                onChange={(e) => setApplicant({ ...applicant, district: e.target.value })}
                placeholder="Rangamati"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5-STAGE PROVENANCE CAPTURE WORKFLOW */}
      <div className="citizen-status-card" style={{ border: '2px solid #BBF7D0' }}>
        <h3 className="card-title" style={{ color: '#166534' }}>
          📜 5-Stage Information Transformation & Provenance Chain
        </h3>
        <p style={{ fontSize: '13px', color: '#475569', marginTop: '-6px' }}>
          Each transformation is recorded independently in the immutable provenance log. The original oral narrative is never overwritten.
        </p>

        {/* Stage 1: Spoken by Person (Marma) */}
        <div className="intake-section" style={{ backgroundColor: '#FAFAFA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="intake-section-title">🎤 {t('udc.stage1Title')}</span>
            <span className="badge-count" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>Stage 1 • Spoken Source</span>
          </div>
          <p className="intake-section-desc">{t('udc.stage1Source')}</p>
          <textarea
            className="form-textarea"
            rows="3"
            value={stage1Marma}
            onChange={(e) => setStage1Marma(e.target.value)}
            placeholder="Enter or paste original spoken Marma statement..."
          />
        </div>

        {/* Stage 2: Translated (Marma -> Bangla) */}
        <div className="intake-section" style={{ backgroundColor: '#F0FDF4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="intake-section-title">🌐 {t('udc.stage2Title')}</span>
            <span className="badge-count" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>Stage 2 • Translation</span>
          </div>
          <p className="intake-section-desc">{t('udc.stage2Source')}</p>
          <textarea
            className="form-textarea"
            rows="3"
            value={stage2Bangla}
            onChange={(e) => setStage2Bangla(e.target.value)}
            placeholder="মারমা বক্তব্য থেকে বাংলায় অনুবাদকৃত বিবরণ লিখুন..."
          />
        </div>

        {/* Stage 3: Typed by Staff */}
        <div className="intake-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="intake-section-title">⌨️ {t('udc.stage3Title')}</span>
            <span className="badge-count" style={{ backgroundColor: '#E0E7FF', color: '#3730A3' }}>Stage 3 • Terminal Record</span>
          </div>
          <p className="intake-section-desc">{t('udc.stage3Source')}</p>
          <textarea
            className="form-textarea"
            rows="3"
            value={stage3Typed}
            onChange={(e) => setStage3Typed(e.target.value)}
            placeholder="ইউডিসি উদ্যোক্তা কর্তৃক টার্মিনালে রক্ষিত আবেদন বিবরণ..."
          />
        </div>

        {/* Stage 4: AI Pre-assessment */}
        <div className="intake-section" style={{ backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span className="intake-section-title" style={{ color: '#1E3A8A' }}>🤖 {t('udc.stage4Title')}</span>
            <button
              type="button"
              className="btn-confirm-sm"
              onClick={handleRunAi}
              disabled={runningAi || (!stage1Marma && !stage2Bangla)}
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              {runningAi ? 'Evaluating...' : '✨ Run AI Classification'}
            </button>
          </div>
          <p className="intake-section-desc" style={{ color: '#1E40AF' }}>{t('udc.stage4Source')}</p>

          {aiResult && (
            <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <div>Category: <strong style={{ color: '#0F766E' }}>{aiResult.suggested_category}</strong></div>
                <div>Risk Level: <strong style={{ color: '#B45309' }}>{aiResult.risk_level}</strong></div>
                <div>Jurisdiction: <strong>{aiResult.suggested_jurisdiction}</strong></div>
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <strong>Required Checklist:</strong> {aiResult.document_checklist.join(' • ')}
              </div>
              <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                ⚠️ {aiResult.disclaimer}
              </div>
            </div>
          )}
        </div>

        {/* Stage 5: Human Officer Verification Banner */}
        <div className="intake-section" style={{ backgroundColor: '#FFFDF5', borderColor: '#FDE68A' }}>
          <span className="intake-section-title" style={{ color: '#854D0E' }}>⚖️ {t('udc.stage5Title')}</span>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#92400E' }}>
            Status: <strong>{t('udc.stage5Pending')}</strong> (Certified upon DLAO Officer review).
          </p>
        </div>

        {/* Actions Row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
          <button
            type="button"
            className="btn-citizen-cta"
            onClick={handleSaveOffline}
            style={{ backgroundColor: '#0F766E', color: '#FFFFFF' }}
          >
            {t('udc.saveOfflineBtn')}
          </button>
          <button
            type="button"
            className="btn-citizen-primary"
            onClick={handleSyncNow}
            disabled={syncing}
            style={{ backgroundColor: isEffectivelyOnline ? '#15803D' : '#94A3B8' }}
          >
            {syncing ? 'Syncing Queue...' : t('udc.syncNowBtn')}
          </button>
        </div>
      </div>

      {/* UDC OFFLINE SYNCHRONIZATION QUEUE & SYNC CENTER */}
      <div className="citizen-status-card" id="sync-center">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="card-title">🔄 {t('sync.title')}</h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
              Browser IndexedDB Storage Queue • Resilient to network outages
            </p>
          </div>
          <button
            type="button"
            className="btn-citizen-primary"
            onClick={handleSyncNow}
            disabled={syncing || queueStats.pending === 0}
            style={{ minHeight: '40px', padding: '8px 18px', fontSize: '13px' }}
          >
            {syncing ? 'Processing...' : `🔄 ${t('sync.syncAll')} (${queueStats.pending})`}
          </button>
        </div>

        {/* Queue Metrics */}
        <div className="citizen-facts-grid" style={{ marginTop: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          <div className="citizen-fact-cell" style={{ borderLeft: '4px solid #F59E0B' }}>
            <span className="fact-label">{t('sync.pending')}</span>
            <span className="fact-value" style={{ color: '#D97706' }}>{queueStats.pending}</span>
          </div>
          <div className="citizen-fact-cell" style={{ borderLeft: '4px solid #22C55E' }}>
            <span className="fact-label">{t('sync.synced')}</span>
            <span className="fact-value" style={{ color: '#166534' }}>{queueStats.synced}</span>
          </div>
          <div className="citizen-fact-cell" style={{ borderLeft: '4px solid #EF4444' }}>
            <span className="fact-label">{t('sync.conflict')}</span>
            <span className="fact-value" style={{ color: '#DC2626' }}>{queueStats.conflict}</span>
          </div>
          <div className="citizen-fact-cell" style={{ borderLeft: '4px solid #64748B' }}>
            <span className="fact-label">{t('sync.total')}</span>
            <span className="fact-value">{queueStats.total}</span>
          </div>
        </div>

        {/* Itemized Queue List */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {queue.length === 0 ? (
            <div className="empty-hint" style={{ textAlign: 'center', padding: '24px' }}>
              No items currently queued in IndexedDB. Use "Save Locally" above to queue offline applications.
            </div>
          ) : (
            queue.map((item) => (
              <div key={item.local_id} style={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 16px',
                backgroundColor: item.sync_status === 'CONFLICT' ? '#FEF2F2' : (item.sync_status === 'SYNCED' ? '#F0FDF4' : '#FAFAFA'),
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '13px', color: '#1E293B' }}>
                      {item.local_id}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: item.sync_status === 'SYNCED' ? '#DCFCE7' : (item.sync_status === 'CONFLICT' ? '#FEE2E2' : '#FEF3C7'),
                      color: item.sync_status === 'SYNCED' ? '#166534' : (item.sync_status === 'CONFLICT' ? '#991B1B' : '#92400E')
                    }}>
                      {item.sync_status}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>
                    <strong>{item.application_payload?.applicant?.full_name}</strong> • {item.application_payload?.category} • {new Date(item.created_at).toLocaleTimeString()}
                  </div>

                  {item.server_application_id && (
                    <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                      Official Server ID: <strong>{item.server_application_id}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {item.sync_status === 'CONFLICT' && (
                    <button
                      type="button"
                      className="btn-sim-offline"
                      style={{ backgroundColor: '#EF4444', borderColor: '#DC2626' }}
                      onClick={() => handleOpenConflict(item)}
                    >
                      ⚠️ {t('sync.conflictTitle')}
                    </button>
                  )}

                  {item.sync_status === 'PENDING_SYNC' && (
                    <button
                      type="button"
                      className="btn-confirm-sm"
                      onClick={handleSyncNow}
                      disabled={syncing}
                    >
                      Sync
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-secondary-sm"
                    style={{ color: '#991B1B' }}
                    onClick={async () => {
                      await offlineDb.removeQueueItem(item.local_id);
                      refreshQueue();
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CONFLICT RESOLUTION MODAL */}
      {activeConflictItem && (
        <div className="conflict-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="conflict-dialog-title">
          <div className="conflict-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <h3 id="conflict-dialog-title" style={{ margin: 0, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚠️ {t('sync.conflictTitle')}
              </h3>
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => setActiveConflictItem(null)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginTop: '10px' }}>
              {t('sync.conflictExplanation')}
            </p>

            {/* Conflicting Fields Comparison Table */}
            <table className="conflict-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '14px', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>{t('sync.field')}</th>
                  <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0', color: '#166534' }}>{t('sync.localVersion')}</th>
                  <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0', color: '#1D4ED8' }}>{t('sync.serverVersion')}</th>
                </tr>
              </thead>
              <tbody>
                {(activeConflictItem.conflict_data?.conflicting_fields || []).map((cf) => (
                  <tr key={cf.field}>
                    <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: '700' }}>{cf.label}</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', backgroundColor: '#F0FDF4' }}>{cf.local || 'None'}</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', backgroundColor: '#EFF6FF' }}>{cf.server || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Resolution Strategy Select */}
            <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700' }}>Choose Resolution Action:</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="strategy"
                    value="KEEP_LOCAL"
                    checked={conflictResolutionStrategy === 'KEEP_LOCAL'}
                    onChange={() => setConflictResolutionStrategy('KEEP_LOCAL')}
                  />
                  <span>{t('sync.keepLocal')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="strategy"
                    value="KEEP_SERVER"
                    checked={conflictResolutionStrategy === 'KEEP_SERVER'}
                    onChange={() => setConflictResolutionStrategy('KEEP_SERVER')}
                  />
                  <span>{t('sync.keepServer')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="strategy"
                    value="MERGE"
                    checked={conflictResolutionStrategy === 'MERGE'}
                    onChange={() => setConflictResolutionStrategy('MERGE')}
                  />
                  <span>{t('sync.reviewMerge')}</span>
                </label>
              </div>

              {conflictResolutionStrategy === 'MERGE' && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700' }}>Merged Narrative Text:</label>
                  <textarea
                    rows="3"
                    className="form-textarea"
                    value={mergedForm.summary}
                    onChange={(e) => setMergedForm({ ...mergedForm, summary: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => setActiveConflictItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-citizen-primary"
                onClick={handleResolveConflict}
                style={{ minHeight: '36px', padding: '8px 18px', fontSize: '13px' }}
              >
                Confirm Conflict Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
