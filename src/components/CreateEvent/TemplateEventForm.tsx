import { useContext, useEffect, useState } from "react";
import EventSchedule from "../EventSchedule";
import { AppContext } from "../../contexts/AppContext";
import InputField from "../InputField";
import { AuthContext } from "../../contexts/AuthContext";
import { FormContext } from "../../contexts/FormContext";
import { FiArrowLeft, FiUpload } from "react-icons/fi";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../../config/firebase";
import { saveEvent, updateEvent } from "../../api/events";
import { useNavigate } from "react-router-dom";
import Loader from "../Loader";

const TemplateEventForm = ({ event }: any | { event: any | null }) => {
  const {
    selectedTemplate,
    setCurrentStep,
    creationSteps,
    setCreationSteps,
    currentStep,
  } = useContext(AppContext);

  const {
    eventData,
    setEventData,
    handleChangeForEventInfo,
    handleChangeForEventType,
    handleChangeForCompletedSteps,
  } = useContext(FormContext);
  const { eventInfo } = eventData;

  const [coverImg, setCoverImg] = useState("");

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);

  const linkToImage = async (link: string) => {
    const response = await fetch(link);
    // here image is url/location of image
    const blob = await response.blob();
    const file = new File(
      [blob],
      `${eventData.eventType}_image.${blob.type.split("/")[1]}`,
      {
        type: blob.type,
      },
    );
    return file;
  };

  const handleUpload: Function = async (file: any, eventData: any) => {
    // const file = e.target.files[0];
    // const imgUrl: any = await convertBase64(file);
    if (!file) return;
    const storageRef = ref(storage, `images/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot: any) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        );
        console.log(progress);
        setIsLoadingImage(true);
      },
      (error: any) => {
        alert(error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
          setCoverImg(downloadURL);
          const newData = { ...eventData, eventImg: downloadURL };

          if (event) {
            await updateEvent(event.eventId, user?.uid, newData);
          }
          setEventData(newData);
          setIsLoadingImage(false);
        });
      },
    );
  };

  useEffect(() => {
    const runAtStart = async () => {
      if (event || selectedTemplate) {
        if (event) {
          setCoverImg(event?.eventImg);
        } else {
          if (eventData.eventImg.length > 0) {
            const file = await linkToImage(
              `${import.meta.env.VITE_REACT_SITE_URL}${eventData.eventImg}`,
            );
            await handleUpload(file, eventData);
          }
        }
      } else {
        const newData = {
          ...eventData,
          uid: user?.uid,
          eventInfo: { ...eventData.eventInfo, creatorEmail: user?.email },
          eventImg: `${import.meta.env.VITE_REACT_SITE_URL}/templateimages/others.png`,
          completedSteps: [true, false, false, false],
        };
        setEventData!(newData);
        const file = await linkToImage(
          `${import.meta.env.VITE_REACT_SITE_URL}/templateimages/others.png`,
        );
        await handleUpload(file, newData);
      }
    };
    runAtStart();
  }, []);

  const handleBackButton = () => {
    if (event) {
      navigate(`/edit/${eventData.eventId}?step=1`);
    } else setCurrentStep!(creationSteps![0]);
    const newStep = creationSteps!.map((step) => {
      if (step.id === currentStep!.id) {
        return { ...step, checked: false };
      } else {
        return step;
      }
    });
    setCreationSteps!(newStep);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (
      eventData.eventInfo.title.length > 0 &&
      eventData.eventType.length > 0 &&
      eventData.eventInfo.creatorName.length > 0 &&
      eventData.eventInfo.creatorEmail.length > 0 &&
      eventData.eventInfo.socialLink.length > 0 &&
      eventData.eventInfo.eventDesc.length > 0 &&
      eventData.eventInfo.eventLocation.length > 0 &&
      eventData.eventInfo.startDate.length > 0 &&
      eventData.eventInfo.endDate.length > 0 &&
      eventData.eventInfo.startTime.length > 0 &&
      eventData.eventInfo.endTime.length > 0 &&
      eventData.eventInfo.maxNumOfParticipant > 0 &&
      eventData.eventInfo.minNumOfParticipant > 0 &&
      eventData.eventInfo.typeOfParticipants.length > 0 &&
      eventData.eventInfo.amountPerParticipant.length > 0
    ) {
      setIsLoadingSubmit(true);
      if (event) {
        const newData = {
          ...eventData,

          completedSteps: [true, true, false, false],
        };
        await updateEvent(eventData.eventId, user.uid, newData);
        setEventData(newData);
      } else {
        const newData = {
          ...eventData,
          uid: user.uid,
          completedSteps: [true, true, false, false],
        };
        await saveEvent(newData);
      }

      setCurrentStep!(creationSteps![2]);
      setIsLoadingSubmit(false);
      navigate(`/edit/${eventData?.eventId}?step=3`);
    } else {
      handleChangeForCompletedSteps!([true, false, false, false]);
      alert("Fill in all the inputs to proceed");
    }

    // const file = e.target[0]?.files[0];
  };
  const eventInfoChange = (e: any) => {
    handleChangeForEventInfo!(e.target.name, e.target.value);
  };

  return (
    <>
      <form className="event_info_form">
        <div className="mb-12 space-y-3">
          <button
            onClick={handleBackButton}
            className="flex items-center gap-2 text-blue-500"
          >
            <FiArrowLeft />
            Go back
          </button>
          <p className="font-normal">{eventData?.eventType}</p>
          {isLoadingImage ? (
            <Loader />
          ) : (
            <>
              <div className={`relative w-full bg-[${coverImg}]`}>
                <img
                  src={coverImg && coverImg}
                  alt="a cover image illustration of template cover"
                  className="h-[400px] w-full rounded-xl object-cover"
                />
                <input
                  onChange={(e) => {
                    handleUpload(e.target.files![0]);
                  }}
                  type="file"
                  className="hidden"
                  name=""
                  id="eventImg"
                />
                <label
                  className="absolute bottom-0 left-0 right-0 top-0 z-[50] m-auto flex h-[200px] w-[200px] cursor-pointer flex-col items-center justify-center gap-8 rounded-xl bg-gray-300 text-blue-500"
                  htmlFor="eventImg"
                >
                  <FiUpload className="text-4xl text-blue-600" />
                  <span className="z-[51] text-[16px] font-medium">
                    Change event photo
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        <div className="space-y-7">
          {!selectedTemplate && !event && (
            <>
              <InputField
                id="eventType"
                type="text"
                label="Event Type / Category"
                name="eventType"
                placeholder="Event Type"
                value={eventData?.eventType}
                onChange={(e: any) => {
                  handleChangeForEventType!(e.target.value);
                }}
                required={true}
              />
            </>
          )}
          {selectedTemplate && selectedTemplate.templateName == "Others" && (
            <>
              <InputField
                id="eventType"
                type="text"
                label="Event Type / Category"
                name="eventType"
                placeholder="Event Type"
                value={eventData?.eventType}
                onChange={(e: any) => {
                  handleChangeForEventType!(e.target.value);
                }}
                required={true}
              />
            </>
          )}

          <InputField
            id="title"
            type="text"
            label="Title"
            name="title"
            placeholder="Title"
            required={true}
            value={eventInfo.title}
            onChange={eventInfoChange}
          />

          <InputField
            id="name"
            type="text"
            label="Creator name"
            name="creatorName"
            placeholder="name"
            required={true}
            value={eventInfo.creatorName}
            onChange={eventInfoChange}
          />
          <InputField
            id="email"
            type="text"
            label="Email address"
            name="creatorEmail"
            required={true}
            placeholder="Your email address"
            value={eventInfo.creatorEmail}
            onChange={eventInfoChange}
          />
          <InputField
            id="link"
            type="text"
            label="Social link"
            required={true}
            name="socialLink"
            placeholder="https://instagram.com/username (X, instagram, tiktok..)"
            value={eventInfo.socialLink}
            onChange={eventInfoChange}
          />
          <div className="my-2">
            <h4>Tell us about your event</h4>
            <InputField
              id="description"
              type="textarea"
              name="eventDesc"
              required={true}
              label="Event Description"
              placeholder="Fan Hangout..."
              value={eventInfo.eventDesc}
              onChange={eventInfoChange}
            />
          </div>
        </div>

        <div className="my-4">
          <h4>Where are you having the event?</h4>
          <InputField
            id="location"
            type="text"
            required={true}
            label="Location"
            name="eventLocation"
            placeholder="Where are you having the event?"
            value={eventInfo.eventLocation}
            onChange={eventInfoChange}
          />
        </div>

        <div>
          <h4>When is the event?</h4>
          <EventSchedule
            eventInfo={eventInfo}
            handleChangeForEventInfo={eventInfoChange}
          />
        </div>

        <div className="space-y-6">
          <h4>Who’s attending the event?</h4>
          <InputField
            id="min_num_participant"
            type="number"
            label="Minimum number of participants"
            name="minNumOfParticipant"
            placeholder="Minimum"
            required={true}
            value={eventInfo.minNumOfParticipant}
            onChange={eventInfoChange}
          />

          <InputField
            id="max_num_participant"
            required={true}
            type="number"
            label="Maximum number of participants"
            name="maxNumOfParticipant"
            placeholder="Maximum"
            value={eventInfo.maxNumOfParticipant}
            onChange={eventInfoChange}
          />

          <div className="field_set_div">
            <label htmlFor="gender">Participants gender</label>
            <select
              name="typeOfParticipants"
              id="gender"
              className="inputs"
              // type="select"
              value={eventInfo.typeOfParticipants}
              onChange={eventInfoChange}
            >
              <option value="">select an option</option>
              <option value="males">All male</option>
              <option value="females">All female</option>
              <option value="both genders">Both male and female</option>
            </select>
          </div>
        </div>

        <div className="space-y-6">
          <h4>How much is the event</h4>
          <InputField
            id="amount"
            required={true}
            type="text"
            label="Amount per person"
            name="amountPerParticipant"
            placeholder="0.00 (NGN)"
            value={eventInfo.amountPerParticipant}
            onChange={eventInfoChange}
          />
        </div>

        <div className="mt-12 flex w-full justify-between tablet:gap-[100px]">
          <div className="w-full">
            <button
              onClick={handleBackButton}
              className="primary_button block tablet:w-[100%]"
              type="button"
            >
              Back
            </button>
          </div>
          <div className="w-full">
            <button
              onClick={handleSubmit}
              className="primary_button block tablet:w-[100%]"
              disabled={isLoadingSubmit}
              type="submit"
            >
              {isLoadingSubmit ? (
                <>
                  <Loader />
                </>
              ) : (
                <>Save and Continue</>
              )}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default TemplateEventForm;