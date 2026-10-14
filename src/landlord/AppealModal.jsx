import "./AppealModal.css";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { Button } from "@/components/ui/button";

const apartmentImage = (apartment) => {
  const image = apartment?.coverImage || apartment?.cover_image || apartment?.imageUrl || apartment?.image_url || apartment?.images?.[0];
  return typeof image === "string" && image.trim() ? image : null;
};

export const AppealModal = ({
  closeAppealModal,
  appealModal,
  isSubmittingAppeal,
  appealMessage,
  setAppealMessage,
  appealContact,
  setAppealContact,
  appealEvidence,
  setAppealEvidence,
  handleSubmitAppeal,
}) => {
  const image = apartmentImage(appealModal.apartment);
  const isEvidenceResponse = Boolean(appealModal.appealId);

  return <div className="appeal-modal-overlay" onClick={closeAppealModal}>
    <div className="appeal-modal-overlay-2"/>
    <section className="appeal-modal-card" role="dialog" aria-modal="true" aria-labelledby="submit-appeal-title" onClick={(event) => event.stopPropagation()}>
      <div className="appeal-modal-panel">
        <h2 id="submit-appeal-title" className="appeal-modal-submit-appeal">{isEvidenceResponse ? "Submit Additional Evidence" : "Submit Appeal"}</h2>

        <div className="appeal-modal-field">
          <label className="appeal-modal-field-label">Related Apartment</label>
          <div className="appeal-modal-apartment-card">
            {image ? <img src={image} alt="" className="appeal-modal-apartment-image"/> : <div className="appeal-modal-apartment-image appeal-modal-apartment-image-empty" aria-hidden="true"/>}
            <div>
              <strong>{appealModal.apartmentTitle || "Apartment unavailable"}</strong>
              <p>{appealModal.apartment?.address || appealModal.apartment?.location || "Location unavailable"}</p>
            </div>
          </div>
        </div>

        <div className="appeal-modal-panel-3">
          <label className="appeal-modal-field-label" htmlFor="appeal-message">{isEvidenceResponse ? "Evidence Description" : "Appeal Message"} <span aria-hidden="true">*</span></label>
          <textarea id="appeal-message" rows={4} maxLength={500} value={appealMessage} onChange={(event) => setAppealMessage(event.target.value)} placeholder={isEvidenceResponse ? "Describe the additional evidence you are submitting..." : "Explain your appeal and provide any supporting information..."} className="appeal-modal-textarea"/>
          <span className="appeal-modal-500">{appealMessage.length}/500</span>
        </div>

        <div className="appeal-modal-panel-3">
          <label className="appeal-modal-field-label" htmlFor="appeal-contact">Contact Information <em>(Optional)</em></label>
          <input id="appeal-contact" type="email" value={appealContact} onChange={(event) => setAppealContact(event.target.value)} placeholder="Email address" className="appeal-modal-input"/>
        </div>

        <div className="appeal-modal-field">
          <label className="appeal-modal-field-label">Supporting Evidence <span aria-hidden="true">*</span></label>
          <EvidenceUploader evidenceFiles={appealEvidence} onEvidenceChange={setAppealEvidence} maxFiles={5} maxFileSize={5}/>
        </div>
      </div>

      <footer className="appeal-modal-row-5">
        <Button variant="outline" onClick={closeAppealModal} disabled={isSubmittingAppeal} className="appeal-modal-cancel">Close</Button>
        <Button disabled={isSubmittingAppeal} onClick={handleSubmitAppeal} className="appeal-modal-button-2">{isSubmittingAppeal ? "Submitting..." : isEvidenceResponse ? "Submit Evidence" : "Submit Appeal"}</Button>
      </footer>
    </section>
  </div>;
};
